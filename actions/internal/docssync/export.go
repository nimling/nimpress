package docssync

import (
	"os"
	"path/filepath"
	"sort"
	"strings"
)

type ExportPage struct {
	Rel    string
	Target string
}

func frontmatter(text string) (string, bool) {
	if !strings.HasPrefix(text, "---\n") {
		return "", false
	}
	rest := text[4:]
	end := strings.Index(rest, "\n---")
	if end < 0 {
		return "", false
	}
	return rest[:end], true
}

func exportTarget(fm string) (string, bool) {
	for _, line := range strings.Split(fm, "\n") {
		if !strings.HasPrefix(line, "export:") {
			continue
		}
		value := strings.Trim(strings.TrimSpace(strings.TrimPrefix(line, "export:")), `"'`)
		if value == "" || value == "false" {
			return "", false
		}
		return value, true
	}
	return "", false
}

func matchesTarget(value, target string) bool {
	if target == "" {
		return true
	}
	return value == target || value == "true"
}

func FindExports(contentRoot, target string) ([]ExportPage, error) {
	var out []ExportPage
	err := filepath.Walk(contentRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() || !strings.HasSuffix(path, ".md") {
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		fm, ok := frontmatter(string(data))
		if !ok {
			return nil
		}
		value, marked := exportTarget(fm)
		if !marked || !matchesTarget(value, target) {
			return nil
		}
		rel, err := filepath.Rel(contentRoot, path)
		if err != nil {
			return err
		}
		out = append(out, ExportPage{Rel: rel, Target: value})
		return nil
	})
	sort.Slice(out, func(i, j int) bool { return out[i].Rel < out[j].Rel })
	return out, err
}

func rewriteExportedPage(text, version string) string {
	fm, ok := frontmatter(text)
	if !ok {
		return text
	}
	lines := strings.Split(fm, "\n")
	out := make([]string, 0, len(lines)+1)
	hasVersion := false
	packageAt := -1
	for _, line := range lines {
		if strings.HasPrefix(line, "export:") {
			continue
		}
		if strings.HasPrefix(line, "  file:") {
			continue
		}
		if strings.HasPrefix(line, "  version:") {
			hasVersion = true
		}
		if strings.HasPrefix(line, "  package:") {
			packageAt = len(out)
		}
		out = append(out, line)
	}
	if version != "" && !hasVersion && packageAt >= 0 {
		out = append(out[:packageAt+1], append([]string{"  version: " + quoted(version)}, out[packageAt+1:]...)...)
	}
	body := text[4+len(fm):]
	return "---\n" + strings.Join(out, "\n") + body
}

func quoted(v string) string {
	return `"` + v + `"`
}

func CollectExport(contentRoot, outDir, target, version string) (int, error) {
	pages, err := FindExports(contentRoot, target)
	if err != nil {
		return 0, err
	}
	for _, page := range pages {
		srcDir := filepath.Dir(filepath.Join(contentRoot, page.Rel))
		destDir := filepath.Dir(filepath.Join(outDir, page.Rel))
		if err := os.MkdirAll(destDir, 0o755); err != nil {
			return 0, err
		}
		entries, err := os.ReadDir(srcDir)
		if err != nil {
			return 0, err
		}
		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			data, err := os.ReadFile(filepath.Join(srcDir, entry.Name()))
			if err != nil {
				return 0, err
			}
			if strings.HasSuffix(entry.Name(), ".md") {
				data = []byte(rewriteExportedPage(string(data), version))
			}
			if err := os.WriteFile(filepath.Join(destDir, entry.Name()), data, 0o644); err != nil {
				return 0, err
			}
		}
	}
	return len(pages), nil
}
