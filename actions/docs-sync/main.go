package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/nimling/nimpress/actions/internal/docssync"
)

func main() {
	token := os.Getenv("NIMPRESS_TOKEN")
	docsRepo := os.Getenv("NIMPRESS_DOCS_REPO")
	docsDir := os.Getenv("NIMPRESS_DOCS_DIR")
	sourceRepo := os.Getenv("NIMPRESS_SOURCE_REPO")
	source := os.Getenv("NIMPRESS_SOURCE")
	contentRoot := os.Getenv("NIMPRESS_CONTENT_ROOT")
	mappingPath := os.Getenv("NIMPRESS_MAPPING")
	defaultsRaw := os.Getenv("NIMPRESS_DEFAULTS")

	for k, v := range map[string]string{
		"NIMPRESS_TOKEN": token, "NIMPRESS_DOCS_REPO": docsRepo, "NIMPRESS_DOCS_DIR": docsDir,
		"NIMPRESS_SOURCE_REPO": sourceRepo, "NIMPRESS_SOURCE": source, "NIMPRESS_CONTENT_ROOT": contentRoot,
	} {
		if v == "" {
			fail(k + " is required")
		}
	}
	if info, err := os.Stat(source); err != nil || !info.IsDir() {
		fail("no .nimpress folder at " + source)
	}

	cfg, err := docssync.ParseConfig(defaultsRaw)
	if err != nil {
		fail("parse defaults: " + err.Error())
	}
	if mappingPath != "" {
		if m, err := docssync.LoadMapping(mappingPath); err == nil {
			if src, ok := m.Sources[sourceRepo]; ok {
				cfg = docssync.Merge(cfg, src)
			}
		}
	}
	if cfg.Publish == "" {
		cfg.Publish = "pr"
	}
	if cfg.Branch == "" {
		cfg.Branch = "main"
	}
	targets := cfg.ResolvedTargets()
	if len(targets) == 0 {
		fail("no target configured for " + sourceRepo)
	}

	var added, modified, deleted, tos, paths []string
	for _, t := range targets {
		src := filepath.Join(source, filepath.FromSlash(t.From))
		dest := filepath.Join(contentRoot, filepath.FromSlash(t.To))
		res, err := docssync.Sync(src, dest, t.Mode)
		if err != nil {
			fail("sync " + t.To + ": " + err.Error())
		}
		added = append(added, res.Added...)
		modified = append(modified, res.Modified...)
		deleted = append(deleted, res.Deleted...)
		tos = append(tos, t.To)
		paths = append(paths, dest)
	}
	if len(added)+len(modified)+len(deleted) == 0 {
		fmt.Printf("no change for %s, nothing to publish\n", sourceRepo)
		writeOutput("result", "none")
		return
	}

	version := ""
	if len(cfg.Version.Files) > 0 {
		version, err = docssync.BumpFiles(docsDir, cfg.Version.Files)
		if err != nil {
			fail("bump version: " + err.Error())
		}
	}

	data := docssync.TemplateData{
		Repo: sourceRepo, Target: strings.Join(tos, ", "), Branch: cfg.Branch, Version: version,
		Added: added, Modified: modified, Deleted: deleted,
	}
	commitMsg := render(orDefault(cfg.Commit.Message, "Sync docs from {{.Repo}}"), data)

	for _, spec := range cfg.Version.Files {
		if at := strings.LastIndex(spec, "@"); at > 0 {
			paths = append(paths, filepath.Join(docsDir, filepath.FromSlash(spec[:at])))
		}
	}

	git := docssync.Git{Dir: docsDir, Repo: docsRepo, Token: token}
	if err := git.Configure(); err != nil {
		fail(err.Error())
	}
	if err := git.Commit(commitMsg, paths); err != nil {
		fail(err.Error())
	}

	if cfg.Publish == "auto" {
		pushed := git.PushBranch(cfg.Branch) == nil
		if !pushed {
			if git.RebaseOnto(cfg.Branch) == nil {
				pushed = git.PushBranch(cfg.Branch) == nil
			}
		}
		if pushed {
			if cfg.Version.Tag != "" && version != "" {
				if err := git.PushTag(render(cfg.Version.Tag, data)); err != nil {
					fail("push tag: " + err.Error())
				}
			}
			fmt.Printf("committed %s to %s\n", data.Target, cfg.Branch)
			writeOutput("result", "pushed")
			return
		}
	}

	prBranch := "docs-sync/" + sourceRepo
	if err := git.PushBranchForce(prBranch); err != nil {
		fail("push pr branch: " + err.Error())
	}
	title := render(orDefault(cfg.PullRequest.Title, "Docs sync from {{.Repo}}"), data)
	body := render(orDefault(cfg.PullRequest.Body, "Docs sync from {{.Repo}} into {{.Target}}."), data)
	labels, err := docssync.RenderAll(cfg.PullRequest.Labels, data)
	if err != nil {
		fail("render labels: " + err.Error())
	}
	gh := docssync.GitHub{Repo: docsRepo, Token: token}
	if err := gh.CreatePR(prBranch, cfg.Branch, title, body, labels); err != nil {
		fail(err.Error())
	}
	fmt.Printf("opened pull request from %s into %s\n", prBranch, cfg.Branch)
	writeOutput("result", "pr")
}

func render(tmpl string, data docssync.TemplateData) string {
	out, err := docssync.Render(tmpl, data)
	if err != nil {
		fail("render: " + err.Error())
	}
	return out
}

func orDefault(v, def string) string {
	if v == "" {
		return def
	}
	return v
}

func writeOutput(key, value string) {
	out := os.Getenv("GITHUB_OUTPUT")
	if out == "" {
		return
	}
	f, err := os.OpenFile(out, os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return
	}
	defer f.Close()
	fmt.Fprintf(f, "%s=%s\n", key, value)
}

func fail(msg string) {
	fmt.Fprintln(os.Stderr, "docs-sync: "+msg)
	os.Exit(1)
}
