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
	Gate   string
	Folder bool
}

type exportSpec struct {
	target string
	gate   string
	set    bool
	off    bool
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

func unquote(value string) string {
	return strings.Trim(strings.TrimSpace(value), `"'`)
}

func readExport(fm string) exportSpec {
	lines := strings.Split(fm, "\n")
	for i, line := range lines {
		if !strings.HasPrefix(line, "export:") {
			continue
		}
		value := unquote(strings.TrimPrefix(line, "export:"))
		if value == "false" {
			return exportSpec{set: true, off: true}
		}
		if value != "" {
			return exportSpec{target: value, set: true}
		}
		spec := exportSpec{set: true}
		for _, nested := range lines[i+1:] {
			if !strings.HasPrefix(nested, "  ") {
				break
			}
			key, val, ok := strings.Cut(strings.TrimSpace(nested), ":")
			if !ok {
				continue
			}
			switch key {
			case "target":
				spec.target = unquote(val)
			case "gate":
				spec.gate = unquote(val)
			}
		}
		if spec.target == "" {
			spec.target = "true"
		}
		return spec
	}
	return exportSpec{}
}

func matchesTarget(value, target string) bool {
	if target == "" {
		return true
	}
	return value == target || value == "true"
}

func readSpec(path string) (exportSpec, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return exportSpec{}, nil
		}
		return exportSpec{}, err
	}
	fm, ok := frontmatter(string(data))
	if !ok {
		return exportSpec{}, nil
	}
	return readExport(fm), nil
}

func FindExports(contentRoot, target string) ([]ExportPage, error) {
	var out []ExportPage
	folders := map[string]exportSpec{}
	err := filepath.Walk(contentRoot, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if info.IsDir() {
			own, err := readSpec(filepath.Join(path, "index.md"))
			if err != nil {
				return err
			}
			inherited := folders[filepath.Dir(path)]
			if path == contentRoot {
				inherited = exportSpec{}
			}
			switch {
			case own.set && own.off:
				folders[path] = exportSpec{}
			case own.set:
				folders[path] = own
			default:
				folders[path] = inherited
			}
			return nil
		}
		if !strings.HasSuffix(path, ".md") {
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
		own := readExport(fm)
		folder := folders[filepath.Dir(path)]
		spec, inFolder := own, false
		if folder.set && !(own.set && own.off) && (!own.set || filepath.Base(path) == "index.md") {
			spec, inFolder = folder, true
		}
		if !spec.set || spec.off || !matchesTarget(spec.target, target) {
			return nil
		}
		rel, err := filepath.Rel(contentRoot, path)
		if err != nil {
			return err
		}
		out = append(out, ExportPage{Rel: rel, Target: spec.target, Gate: spec.gate, Folder: inFolder})
		return nil
	})
	sort.Slice(out, func(i, j int) bool { return out[i].Rel < out[j].Rel })
	return out, err
}

func rewriteExportedPage(text, version, gate string) string {
	fm, ok := frontmatter(text)
	if !ok {
		return text
	}
	lines := strings.Split(fm, "\n")
	out := make([]string, 0, len(lines)+2)
	hasVersion := false
	hasGate := false
	packageAt := -1
	inExport := false
	for _, line := range lines {
		if inExport && strings.HasPrefix(line, "  ") {
			continue
		}
		inExport = false
		if strings.HasPrefix(line, "export:") {
			inExport = true
			continue
		}
		if strings.HasPrefix(line, "  file:") {
			continue
		}
		if strings.HasPrefix(line, "gate:") {
			hasGate = true
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
	if gate != "" && !hasGate {
		out = append(out, "gate: "+gate)
	}
	body := text[4+len(fm):]
	return "---\n" + strings.Join(out, "\n") + body
}

func quoted(v string) string {
	return `"` + v + `"`
}

func copyExported(src, dest, version, gate string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	if strings.HasSuffix(src, ".md") {
		data = []byte(rewriteExportedPage(string(data), version, gate))
	}
	if err := os.MkdirAll(filepath.Dir(dest), 0o755); err != nil {
		return err
	}
	return os.WriteFile(dest, data, 0o644)
}

func CollectExport(contentRoot, outDir, target, version string) (int, error) {
	pages, err := FindExports(contentRoot, target)
	if err != nil {
		return 0, err
	}
	written := map[string]bool{}
	exported := map[string]ExportPage{}
	for _, page := range pages {
		exported[page.Rel] = page
	}
	for _, page := range pages {
		srcDir := filepath.Dir(filepath.Join(contentRoot, page.Rel))
		entries, err := os.ReadDir(srcDir)
		if err != nil {
			return 0, err
		}
		for _, entry := range entries {
			if entry.IsDir() {
				continue
			}
			rel, err := filepath.Rel(contentRoot, filepath.Join(srcDir, entry.Name()))
			if err != nil {
				return 0, err
			}
			if written[rel] {
				continue
			}
			gate := page.Gate
			if strings.HasSuffix(entry.Name(), ".md") {
				other, ok := exported[rel]
				if !ok && page.Folder {
					continue
				}
				if ok {
					gate = other.Gate
				}
			}
			if err := copyExported(filepath.Join(srcDir, entry.Name()), filepath.Join(outDir, rel), version, gate); err != nil {
				return 0, err
			}
			written[rel] = true
		}
	}
	return len(pages), nil
}
