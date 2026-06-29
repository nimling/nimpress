package docssync

import (
	"bytes"
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
)

type Source struct {
	Target string `json:"target"`
	Mode   string `json:"mode"`
}

type Mapping struct {
	Sources     map[string]Source `json:"sources"`
	AutoPublish []string          `json:"autoPublish"`
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

func (m Mapping) IsAuto(repo string) bool {
	for _, r := range m.AutoPublish {
		if r == repo {
			return true
		}
	}
	return false
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
