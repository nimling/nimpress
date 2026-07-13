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
