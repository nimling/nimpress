package docssync

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type GitHub struct {
	Repo  string
	Token string
}

func (h GitHub) post(path string, payload any) ([]byte, int, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, 0, err
	}
	req, err := http.NewRequest(http.MethodPost, "https://api.github.com/repos/"+h.Repo+path, bytes.NewReader(body))
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("Authorization", "Bearer "+h.Token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	return data, resp.StatusCode, nil
}

func (h GitHub) CreatePR(head, base, title, body string, labels []string) error {
	data, status, err := h.post("/pulls", map[string]string{
		"head":  head,
		"base":  base,
		"title": title,
		"body":  body,
	})
	if err != nil {
		return err
	}
	if status == http.StatusUnprocessableEntity {
		return nil
	}
	if status >= 300 {
		return fmt.Errorf("create pull request returned %d: %s", status, string(data))
	}
	if len(labels) == 0 {
		return nil
	}
	var pr struct {
		Number int `json:"number"`
	}
	if err := json.Unmarshal(data, &pr); err != nil {
		return err
	}
	_, status, err = h.post(fmt.Sprintf("/issues/%d/labels", pr.Number), map[string][]string{"labels": labels})
	if err != nil {
		return err
	}
	if status >= 300 {
		return fmt.Errorf("add labels returned %d", status)
	}
	return nil
}
