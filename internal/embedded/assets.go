package embedded

import (
	"embed"
	"fmt"
	"io/fs"
	"path/filepath"
	"runtime"
)

//go:embed all:web all:agent all:bun
var assetsFS embed.FS

func AssetsFS() fs.FS {
	return assetsFS
}

func WebFS() (fs.FS, error) {
	return fs.Sub(assetsFS, "web")
}

func AgentFS() (fs.FS, error) {
	return fs.Sub(assetsFS, "agent")
}

func BunFS(goos, goarch string) (fs.FS, string, error) {
	if goos == "" {
		goos = runtime.GOOS
	}
	if goarch == "" {
		goarch = runtime.GOARCH
	}
	sub := filepath.ToSlash(filepath.Join("bun", goos+"-"+goarch))
	dirFS, err := fs.Sub(assetsFS, sub)
	if err != nil {
		return nil, "", fmt.Errorf("bun runtime not bundled for %s/%s: %w", goos, goarch, err)
	}
	bin := "bun"
	if goos == "windows" {
		bin = "bun.exe"
	}
	return dirFS, bin, nil
}
