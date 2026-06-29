package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

func main() {
	token := os.Getenv("GITHUB_TOKEN")
	docsRepo := os.Getenv("NIMPRESS_DOCS_REPO")
	eventType := os.Getenv("NIMPRESS_EVENT_TYPE")
	sourceRepo := os.Getenv("NIMPRESS_SOURCE_REPO")
	sha := os.Getenv("NIMPRESS_SHA")
	ref := os.Getenv("NIMPRESS_REF")
	workspace := os.Getenv("NIMPRESS_WORKSPACE")
	if eventType == "" {
		eventType = "nimpress-docs-sync"
	}
	if token == "" || docsRepo == "" || sourceRepo == "" || sha == "" {
		fail("GITHUB_TOKEN, NIMPRESS_DOCS_REPO, NIMPRESS_SOURCE_REPO and NIMPRESS_SHA are required")
	}
	nimpressDir := filepath.Join(workspace, ".nimpress")
	if info, err := os.Stat(nimpressDir); err != nil || !info.IsDir() {
		fail("no .nimpress folder at " + nimpressDir)
	}
	payload := map[string]any{
		"event_type": eventType,
		"client_payload": map[string]string{
			"repo": sourceRepo,
			"sha":  sha,
			"ref":  ref,
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		fail("encode payload: " + err.Error())
	}
	url := "https://api.github.com/repos/" + docsRepo + "/dispatches"
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		fail("build request: " + err.Error())
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		fail("dispatch: " + err.Error())
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		msg, _ := io.ReadAll(resp.Body)
		fail(fmt.Sprintf("dispatch returned %d: %s", resp.StatusCode, string(msg)))
	}
	fmt.Printf("dispatched %s to %s for %s@%s\n", eventType, docsRepo, sourceRepo, sha)
}

func fail(msg string) {
	fmt.Fprintln(os.Stderr, "docs-notify: "+msg)
	os.Exit(1)
}
