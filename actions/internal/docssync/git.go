package docssync

import (
	"fmt"
	"os/exec"
	"strings"
)

type Git struct {
	Dir   string
	Repo  string
	Token string
}

func (g Git) run(args ...string) (string, error) {
	cmd := exec.Command("git", append([]string{"-C", g.Dir}, args...)...)
	out, err := cmd.CombinedOutput()
	if err != nil {
		return string(out), fmt.Errorf("git %s: %v: %s", strings.Join(args, " "), err, strings.TrimSpace(string(out)))
	}
	return string(out), nil
}

func (g Git) remote() string {
	return fmt.Sprintf("https://x-access-token:%s@github.com/%s.git", g.Token, g.Repo)
}

func (g Git) Configure() error {
	if _, err := g.run("config", "user.name", "nimpress-bot"); err != nil {
		return err
	}
	_, err := g.run("config", "user.email", "bot@nimling.dev")
	return err
}

func (g Git) Commit(message string, paths []string) error {
	if _, err := g.run(append([]string{"add", "--"}, paths...)...); err != nil {
		return err
	}
	_, err := g.run("commit", "-m", message)
	return err
}

func (g Git) PushBranch(branch string) error {
	_, err := g.run("push", g.remote(), "HEAD:refs/heads/"+branch)
	return err
}

func (g Git) PushBranchForce(branch string) error {
	_, err := g.run("push", "-f", g.remote(), "HEAD:refs/heads/"+branch)
	return err
}

func (g Git) PushTag(tag string) error {
	if _, err := g.run("tag", "-f", tag); err != nil {
		return err
	}
	_, err := g.run("push", "-f", g.remote(), "refs/tags/"+tag)
	return err
}

func (g Git) RebaseOnto(branch string) error {
	if _, err := g.run("fetch", g.remote(), branch); err != nil {
		return err
	}
	_, err := g.run("rebase", "FETCH_HEAD")
	if err != nil {
		_, _ = g.run("rebase", "--abort")
	}
	return err
}
