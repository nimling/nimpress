package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/nimling/nimpress/actions/internal/docssync"
)

func main() {
	sourceDir := os.Getenv("NIMPRESS_SOURCE_DIR")
	contentDir := os.Getenv("NIMPRESS_CONTENT_DIR")
	target := os.Getenv("NIMPRESS_TARGET")
	out := os.Getenv("NIMPRESS_OUT")
	if sourceDir == "" || out == "" {
		fail("NIMPRESS_SOURCE_DIR and NIMPRESS_OUT are required")
	}
	if contentDir == "" {
		contentDir = "docs"
	}
	version := packageVersion(filepath.Join(sourceDir, "package.json"))
	count, err := docssync.CollectExport(filepath.Join(sourceDir, contentDir), out, target, version)
	if err != nil {
		fail(err.Error())
	}
	if output := os.Getenv("GITHUB_OUTPUT"); output != "" {
		f, err := os.OpenFile(output, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0o644)
		if err == nil {
			fmt.Fprintf(f, "count=%d\n", count)
			f.Close()
		}
	}
	fmt.Printf("exported %d pages from %s to %s\n", count, sourceDir, out)
}

func packageVersion(path string) string {
	data, err := os.ReadFile(path)
	if err != nil {
		return ""
	}
	var pkg struct {
		Version string `json:"version"`
	}
	if err := json.Unmarshal(data, &pkg); err != nil {
		return ""
	}
	return pkg.Version
}

func fail(msg string) {
	fmt.Fprintln(os.Stderr, "docs-export: "+msg)
	os.Exit(1)
}
