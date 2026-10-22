package docssync

import (
	"os/exec"
	"path/filepath"
	"testing"
)

func TestGitChanged(t *testing.T) {
	dir := t.TempDir()
	g := Git{Dir: dir}
	for _, args := range [][]string{{"init", "-q"}, {"config", "user.email", "t@t"}, {"config", "user.name", "t"}} {
		if out, err := exec.Command("git", append([]string{"-C", dir}, args...)...).CombinedOutput(); err != nil {
			t.Fatalf("%v: %s", err, out)
		}
	}
	write(t, dir, "package.json", "{\"version\":\"1.0.0\"}\n")
	if err := g.Commit("init", []string{filepath.Join(dir, "package.json")}); err != nil {
		t.Fatal(err)
	}
	paths := []string{filepath.Join(dir, "package.json"), filepath.Join(dir, "pnpm-lock.yaml")}
	if changed, err := g.Changed(paths); err != nil || changed {
		t.Fatalf("a clean tree is unchanged, got %v %v", changed, err)
	}
	write(t, dir, "pnpm-lock.yaml", "lockfileVersion: '9.0'\n")
	if changed, err := g.Changed(paths); err != nil || !changed {
		t.Fatalf("a new lockfile is a change, got %v %v", changed, err)
	}
}
