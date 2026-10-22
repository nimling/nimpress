package docssync

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestCollectExport(t *testing.T) {
	src := t.TempDir()
	out := t.TempDir()
	dir := filepath.Join(src, "components", "Components", "MarButton")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	page := `---
title: MarButton
type: component
export: docs
data:
  system: nimtech
  component: MarButton
  package: "@nimling/components-nimtech"
  file: "MarButton/MarButton.vue"
---

## Usage
`
	if err := os.WriteFile(filepath.Join(dir, "index.md"), []byte(page), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "primary.story.ts"), []byte("export default {}\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	skipped := filepath.Join(src, "components", "Components", "MarChip")
	if err := os.MkdirAll(skipped, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(skipped, "index.md"), []byte("---\ntitle: MarChip\n---\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	count, err := CollectExport(src, out, "docs", "0.2.0")
	if err != nil {
		t.Fatal(err)
	}
	if count != 1 {
		t.Fatalf("expected 1 exported page, got %d", count)
	}
	rewritten, err := os.ReadFile(filepath.Join(out, "components", "Components", "MarButton", "index.md"))
	if err != nil {
		t.Fatal(err)
	}
	text := string(rewritten)
	if strings.Contains(text, "export:") || strings.Contains(text, "file:") {
		t.Fatalf("export and file lines must be dropped, got:\n%s", text)
	}
	if !strings.Contains(text, `version: "0.2.0"`) {
		t.Fatalf("version must be stamped, got:\n%s", text)
	}
	if !strings.Contains(text, "## Usage") {
		t.Fatalf("body must survive, got:\n%s", text)
	}
	if _, err := os.Stat(filepath.Join(out, "components", "Components", "MarButton", "primary.story.ts")); err != nil {
		t.Fatal("story must be copied")
	}
	if _, err := os.Stat(filepath.Join(out, "components", "Components", "MarChip")); !os.IsNotExist(err) {
		t.Fatal("unmarked page must not be exported")
	}
}

func read(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

func TestCollectExportFolder(t *testing.T) {
	src := t.TempDir()
	out := t.TempDir()
	write(t, src, "index.md", "---\ntitle: Home\n---\n")
	write(t, src, "components/index.md", "---\ntitle: Components\nexport:\n  target: samna\n  gate: components\ncollapsed: true\n---\n")
	write(t, src, "components/harness-setup.ts", "export default {}\n")
	write(t, src, "components/Modals/index.md", "---\nsidebar:\n  name: Modals\n---\n")
	write(t, src, "components/Modals/harness.vue", "<template />\n")
	write(t, src, "components/Modals/MarDialog/index.md", "---\ntitle: MarDialog\ntype: component\ndata:\n  package: \"@nimling/components-nimtech\"\n---\n")
	write(t, src, "components/Modals/MarDialog/default.story.ts", "import Harness from '../harness.vue'\n")
	write(t, src, "components/Draft/index.md", "---\ntitle: Draft\nexport: false\n---\n")
	write(t, src, "components/Draft/Inner/index.md", "---\ntitle: Inner\n---\n")
	write(t, src, "components/Open/index.md", "---\ntitle: Open\ngate: internal\n---\n")

	count, err := CollectExport(src, out, "samna", "0.3.0")
	if err != nil {
		t.Fatal(err)
	}
	if count != 4 {
		t.Fatalf("expected 4 exported pages, got %d", count)
	}
	root := read(t, filepath.Join(out, "components", "index.md"))
	if strings.Contains(root, "export") || strings.Contains(root, "target:") || !strings.Contains(root, "gate: components") || !strings.Contains(root, "collapsed: true") {
		t.Fatalf("the export block must drop and the gate stamp, got:\n%s", root)
	}
	page := read(t, filepath.Join(out, "components", "Modals", "MarDialog", "index.md"))
	if !strings.Contains(page, "gate: components") || !strings.Contains(page, `version: "0.3.0"`) {
		t.Fatalf("a page under the folder takes the gate and the version, got:\n%s", page)
	}
	if !strings.Contains(read(t, filepath.Join(out, "components", "Open", "index.md")), "gate: internal") {
		t.Fatal("a page keeps its own gate")
	}
	for _, rel := range []string{"components/harness-setup.ts", "components/Modals/harness.vue", "components/Modals/MarDialog/default.story.ts"} {
		if _, err := os.Stat(filepath.Join(out, filepath.FromSlash(rel))); err != nil {
			t.Fatalf("%s must be carried", rel)
		}
	}
	for _, rel := range []string{"index.md", "components/Draft", "components/Draft/Inner"} {
		if _, err := os.Stat(filepath.Join(out, filepath.FromSlash(rel))); !os.IsNotExist(err) {
			t.Fatalf("%s must not be exported", rel)
		}
	}
	if count, _ := CollectExport(src, t.TempDir(), "other", ""); count != 0 {
		t.Fatalf("another target exports nothing, got %d", count)
	}
}
