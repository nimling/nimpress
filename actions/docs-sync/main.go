package main

import (
	"fmt"
	"os"
	"strings"

	"github.com/nimling/nimpress/actions/internal/docssync"
)

func main() {
	source := os.Getenv("NIMPRESS_SOURCE")
	mappingPath := os.Getenv("NIMPRESS_MAPPING")
	contentRoot := os.Getenv("NIMPRESS_CONTENT_ROOT")
	repo := os.Getenv("NIMPRESS_REPO")
	if source == "" || mappingPath == "" || contentRoot == "" || repo == "" {
		fail("NIMPRESS_SOURCE, NIMPRESS_MAPPING, NIMPRESS_CONTENT_ROOT and NIMPRESS_REPO are required")
	}
	if info, err := os.Stat(source); err != nil || !info.IsDir() {
		fail("no .nimpress folder at " + source)
	}
	mapping, err := docssync.LoadMapping(mappingPath)
	if err != nil {
		fail("read mapping: " + err.Error())
	}
	entry, ok := mapping.Sources[repo]
	if !ok {
		fail("no mapping entry for " + repo)
	}
	mode := entry.Mode
	if mode == "" {
		mode = "mirror"
	}
	dest := strings.TrimRight(contentRoot, "/") + "/" + strings.Trim(entry.Target, "/")
	res, err := docssync.Sync(source, dest, mode)
	if err != nil {
		fail("sync: " + err.Error())
	}
	writeOutputs(res, mapping.IsAuto(repo))
	fmt.Printf("synced %s into %s: %d added, %d modified, %d deleted\n",
		repo, dest, len(res.Added), len(res.Modified), len(res.Deleted))
}

func writeOutputs(res docssync.Result, auto bool) {
	out := os.Getenv("GITHUB_OUTPUT")
	if out == "" {
		return
	}
	f, err := os.OpenFile(out, os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		return
	}
	defer f.Close()
	fmt.Fprintf(f, "changed=%t\n", res.Changed())
	fmt.Fprintf(f, "auto=%t\n", auto)
	fmt.Fprintf(f, "target=%s\n", res.Target)
	fmt.Fprintf(f, "added=%d\n", len(res.Added))
	fmt.Fprintf(f, "modified=%d\n", len(res.Modified))
	fmt.Fprintf(f, "deleted=%d\n", len(res.Deleted))
}

func fail(msg string) {
	fmt.Fprintln(os.Stderr, "docs-sync: "+msg)
	os.Exit(1)
}
