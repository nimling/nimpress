package docssync

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func write(t *testing.T, root, rel, body string) {
	t.Helper()
	full := filepath.Join(root, filepath.FromSlash(rel))
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(full, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestSyncMirror(t *testing.T) {
	src := t.TempDir()
	dest := t.TempDir()
	write(t, src, "guide/intro.md", "hello")
	write(t, src, "index.md", "home v2")
	write(t, dest, "index.md", "home v1")
	write(t, dest, "stale.md", "gone")

	res, err := Sync(src, dest, "mirror")
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Added) != 1 || res.Added[0] != "guide/intro.md" {
		t.Fatalf("added = %v", res.Added)
	}
	if len(res.Modified) != 1 || res.Modified[0] != "index.md" {
		t.Fatalf("modified = %v", res.Modified)
	}
	if len(res.Deleted) != 1 || res.Deleted[0] != "stale.md" {
		t.Fatalf("deleted = %v", res.Deleted)
	}
	if !res.Changed() {
		t.Fatal("expected changed")
	}
	if data, _ := os.ReadFile(filepath.Join(dest, "index.md")); string(data) != "home v2" {
		t.Fatalf("index = %q", string(data))
	}
	if _, err := os.Stat(filepath.Join(dest, "stale.md")); !os.IsNotExist(err) {
		t.Fatal("stale.md should be removed under mirror")
	}
}

func TestSyncOverlayKeepsExtra(t *testing.T) {
	src := t.TempDir()
	dest := t.TempDir()
	write(t, src, "a.md", "a")
	write(t, dest, "keep.md", "keep")

	res, err := Sync(src, dest, "overlay")
	if err != nil {
		t.Fatal(err)
	}
	if len(res.Deleted) != 0 {
		t.Fatalf("overlay must not delete, got %v", res.Deleted)
	}
	if _, err := os.Stat(filepath.Join(dest, "keep.md")); err != nil {
		t.Fatal("keep.md should remain under overlay")
	}
}

func TestSyncUnchanged(t *testing.T) {
	src := t.TempDir()
	dest := t.TempDir()
	write(t, src, "a.md", "same")
	write(t, dest, "a.md", "same")

	res, err := Sync(src, dest, "mirror")
	if err != nil {
		t.Fatal(err)
	}
	if res.Changed() {
		t.Fatalf("expected no change, got %+v", res)
	}
}

func TestLoadMappingAndAuto(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "map.json")
	body := `{"sources":{"nimling/x":{"target":"solutions/x","mode":"mirror","publish":"auto","branch":"main"}}}`
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
	m, err := LoadMapping(path)
	if err != nil {
		t.Fatal(err)
	}
	entry, ok := m.Sources["nimling/x"]
	if !ok || entry.Target != "solutions/x" || entry.Mode != "mirror" || entry.Publish != "auto" || entry.Branch != "main" {
		t.Fatalf("entry = %+v ok = %v", entry, ok)
	}
}

func TestRender(t *testing.T) {
	data := TemplateData{Repo: "nimling/x", Target: "solutions/x", Version: "1.2.4", Added: []string{"a.md"}}
	out, err := Render("Sync {{.Repo}} to {{.Target}} v{{.Version}} {{len .Added}}", data)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(out, "nimling/x") || !strings.Contains(out, "v1.2.4") || !strings.Contains(out, "1") {
		t.Fatalf("rendered = %q", out)
	}
}

func TestMerge(t *testing.T) {
	base := Config{Mode: "mirror", Publish: "pr", Branch: "main", PullRequest: PRConfig{Labels: []string{"docs"}}}
	over := Config{Publish: "auto", Target: "tools/x", PullRequest: PRConfig{Title: "T"}}
	got := Merge(base, over)
	if got.Mode != "mirror" || got.Publish != "auto" || got.Branch != "main" || got.Target != "tools/x" {
		t.Fatalf("merged = %+v", got)
	}
	if got.PullRequest.Title != "T" || len(got.PullRequest.Labels) != 1 || got.PullRequest.Labels[0] != "docs" {
		t.Fatalf("pr merge = %+v", got.PullRequest)
	}
}

func TestBumpFiles(t *testing.T) {
	dir := t.TempDir()
	write(t, dir, "package.json", `{"name":"x","version":"1.2.9","meta":{"version":"1.2.9"}}`)
	v, err := BumpFiles(dir, []string{"package.json@.version", "package.json@.meta.version"})
	if err != nil {
		t.Fatal(err)
	}
	if v != "1.2.10" {
		t.Fatalf("version = %q", v)
	}
	data, _ := os.ReadFile(filepath.Join(dir, "package.json"))
	if strings.Contains(string(data), `"1.2.9"`) {
		t.Fatalf("file not fully bumped: %s", string(data))
	}
}
