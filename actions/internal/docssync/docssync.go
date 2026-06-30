package docssync

import (
	"bytes"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"text/template"
)

type CommitConfig struct {
	Message string `json:"message"`
}

type PRConfig struct {
	Title  string   `json:"title"`
	Body   string   `json:"body"`
	Labels []string `json:"labels"`
}

type VersionConfig struct {
	Files []string `json:"files"`
	Tag   string   `json:"tag"`
}

type Target struct {
	From string `json:"from"`
	To   string `json:"to"`
	Mode string `json:"mode"`
}

type Config struct {
	Target      string        `json:"target"`
	Targets     []Target      `json:"targets"`
	Mode        string        `json:"mode"`
	Publish     string        `json:"publish"`
	Branch      string        `json:"branch"`
	Secret      string        `json:"secret"`
	Commit      CommitConfig  `json:"commit"`
	PullRequest PRConfig      `json:"pullRequest"`
	Version     VersionConfig `json:"version"`
}

func (c Config) ResolvedTargets() []Target {
	mode := c.Mode
	if mode == "" {
		mode = "mirror"
	}
	if len(c.Targets) > 0 {
		out := make([]Target, 0, len(c.Targets))
		for _, t := range c.Targets {
			if t.Mode == "" {
				t.Mode = mode
			}
			out = append(out, t)
		}
		return out
	}
	if c.Target != "" {
		return []Target{{From: "", To: c.Target, Mode: mode}}
	}
	return nil
}

type Mapping struct {
	Sources map[string]Config `json:"sources"`
}

func Merge(base, over Config) Config {
	out := base
	if over.Target != "" {
		out.Target = over.Target
	}
	if len(over.Targets) > 0 {
		out.Targets = over.Targets
	}
	if over.Mode != "" {
		out.Mode = over.Mode
	}
	if over.Publish != "" {
		out.Publish = over.Publish
	}
	if over.Branch != "" {
		out.Branch = over.Branch
	}
	if over.Secret != "" {
		out.Secret = over.Secret
	}
	if over.Commit.Message != "" {
		out.Commit.Message = over.Commit.Message
	}
	if over.PullRequest.Title != "" {
		out.PullRequest.Title = over.PullRequest.Title
	}
	if over.PullRequest.Body != "" {
		out.PullRequest.Body = over.PullRequest.Body
	}
	if len(over.PullRequest.Labels) > 0 {
		out.PullRequest.Labels = over.PullRequest.Labels
	}
	if len(over.Version.Files) > 0 {
		out.Version.Files = over.Version.Files
	}
	if over.Version.Tag != "" {
		out.Version.Tag = over.Version.Tag
	}
	return out
}

func ParseConfig(raw string) (Config, error) {
	var c Config
	if strings.TrimSpace(raw) == "" {
		return c, nil
	}
	if err := json.Unmarshal([]byte(raw), &c); err != nil {
		return c, err
	}
	return c, nil
}

func LoadMapping(path string) (Mapping, error) {
	var m Mapping
	data, err := os.ReadFile(path)
	if err != nil {
		return m, err
	}
	if err := json.Unmarshal(data, &m); err != nil {
		return m, err
	}
	return m, nil
}

type TemplateData struct {
	Repo     string
	Target   string
	Branch   string
	Version  string
	Added    []string
	Modified []string
	Deleted  []string
}

const defaultPRBody = `Docs sync from {{.Repo}} into {{.Target}}.

{{len .Added}} added, {{len .Modified}} modified, {{len .Deleted}} deleted.`

func Render(tmpl string, data TemplateData) (string, error) {
	t, err := template.New("t").Parse(tmpl)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := t.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

func RenderAll(tmpls []string, data TemplateData) ([]string, error) {
	out := make([]string, 0, len(tmpls))
	for _, t := range tmpls {
		s, err := Render(t, data)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, nil
}

type Result struct {
	Target   string
	Added    []string
	Modified []string
	Deleted  []string
}

func (r Result) Changed() bool {
	return len(r.Added) > 0 || len(r.Modified) > 0 || len(r.Deleted) > 0
}

func relFiles(root string) (map[string][]byte, error) {
	out := map[string][]byte{}
	info, err := os.Stat(root)
	if err != nil {
		return out, err
	}
	if !info.IsDir() {
		return out, nil
	}
	err = filepath.WalkDir(root, func(path string, d os.DirEntry, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if d.IsDir() {
			return nil
		}
		rel, relErr := filepath.Rel(root, path)
		if relErr != nil {
			return relErr
		}
		data, readErr := os.ReadFile(path)
		if readErr != nil {
			return readErr
		}
		out[filepath.ToSlash(rel)] = data
		return nil
	})
	return out, err
}

func Sync(srcDir, destDir, mode string) (Result, error) {
	res := Result{Target: destDir}
	src, err := relFiles(srcDir)
	if err != nil {
		return res, err
	}
	dest, err := relFiles(destDir)
	if err != nil && !os.IsNotExist(err) {
		return res, err
	}
	for rel, data := range src {
		existing, ok := dest[rel]
		if !ok {
			if err := writeFile(destDir, rel, data); err != nil {
				return res, err
			}
			res.Added = append(res.Added, rel)
			continue
		}
		if !bytes.Equal(existing, data) {
			if err := writeFile(destDir, rel, data); err != nil {
				return res, err
			}
			res.Modified = append(res.Modified, rel)
		}
	}
	if mode == "mirror" {
		for rel := range dest {
			if _, ok := src[rel]; !ok {
				if err := os.Remove(filepath.Join(destDir, filepath.FromSlash(rel))); err != nil {
					return res, err
				}
				res.Deleted = append(res.Deleted, rel)
			}
		}
	}
	sort.Strings(res.Added)
	sort.Strings(res.Modified)
	sort.Strings(res.Deleted)
	return res, nil
}

func writeFile(root, rel string, data []byte) error {
	full := filepath.Join(root, filepath.FromSlash(rel))
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return err
	}
	return os.WriteFile(full, data, 0o644)
}

func BumpFiles(dir string, files []string) (string, error) {
	version := ""
	for _, spec := range files {
		at := strings.LastIndex(spec, "@")
		if at < 0 {
			return "", fmt.Errorf("version file %q must be path@.json.path", spec)
		}
		rel := spec[:at]
		path := strings.TrimPrefix(spec[at+1:], ".")
		full := filepath.Join(dir, filepath.FromSlash(rel))
		text, err := os.ReadFile(full)
		if err != nil {
			return "", err
		}
		current, err := jsonValue(text, path)
		if err != nil {
			return "", fmt.Errorf("%s: %w", spec, err)
		}
		next, err := bumpPatch(current)
		if err != nil {
			return "", fmt.Errorf("%s: %w", spec, err)
		}
		replaced := bytes.Replace(text, []byte(`"`+current+`"`), []byte(`"`+next+`"`), 1)
		if err := os.WriteFile(full, replaced, 0o644); err != nil {
			return "", err
		}
		version = strings.TrimPrefix(next, "v")
	}
	return version, nil
}

func jsonValue(text []byte, path string) (string, error) {
	var node any
	if err := json.Unmarshal(text, &node); err != nil {
		return "", err
	}
	for _, key := range strings.Split(path, ".") {
		obj, ok := node.(map[string]any)
		if !ok {
			return "", fmt.Errorf("path %q is not an object", path)
		}
		node = obj[key]
	}
	s, ok := node.(string)
	if !ok {
		return "", fmt.Errorf("value at %q is not a string", path)
	}
	return s, nil
}

func bumpPatch(v string) (string, error) {
	prefix := ""
	body := v
	if strings.HasPrefix(body, "v") {
		prefix = "v"
		body = body[1:]
	}
	parts := strings.Split(body, ".")
	for len(parts) < 3 {
		parts = append(parts, "0")
	}
	patch, err := strconv.Atoi(parts[2])
	if err != nil {
		return "", fmt.Errorf("patch segment of %q is not a number", v)
	}
	parts[2] = strconv.Itoa(patch + 1)
	return prefix + strings.Join(parts[:3], "."), nil
}
