package handlers

import (
	"context"
	"errors"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"gopkg.in/yaml.v3"

	"github.com/memohai/memoh/internal/config"
	mcptools "github.com/memohai/memoh/internal/mcp"
)

type SkillItem struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Content     string         `json:"content"`
	Metadata    map[string]any `json:"metadata,omitempty"`
}

type SkillsResponse struct {
	Skills []SkillItem `json:"skills"`
}

type SkillsUpsertRequest struct {
	Skills []SkillItem `json:"skills"`
}

type SkillsDeleteRequest struct {
	Names []string `json:"names"`
}

type skillsOpResponse struct {
	OK bool `json:"ok"`
}

// ListSkills godoc
// @Summary List skills from container
// @Tags containerd
// @Param bot_id path string true "Bot ID"
// @Success 200 {object} SkillsResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /bots/{bot_id}/container/skills [get]
func (h *ContainerdHandler) ListSkills(c echo.Context) error {
	botID, err := h.requireBotAccess(c)
	if err != nil {
		return err
	}
	ctx := c.Request().Context()
	containerID, err := h.botContainerID(ctx, botID)
	if err != nil {
		return err
	}
	if err := h.ensureTaskRunning(ctx, containerID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	if err := h.ensureSkillsDirHost(botID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	listPayload, err := h.callMCPTool(ctx, containerID, "list", map[string]any{
		"path":      ".skills",
		"recursive": false,
	})
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	entries, err := extractListEntries(listPayload)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	skills := make([]SkillItem, 0, len(entries))
	for _, entry := range entries {
		skillPath, name := skillPathForEntry(entry)
		if skillPath == "" {
			continue
		}
		raw, err := h.readSkillFile(ctx, containerID, skillPath)
		if err != nil {
			continue
		}
		parsed := parseSkillFile(raw, name)
		skills = append(skills, SkillItem{
			Name:        parsed.Name,
			Description: parsed.Description,
			Content:     parsed.Content,
			Metadata:    parsed.Metadata,
		})
	}

	return c.JSON(http.StatusOK, SkillsResponse{Skills: skills})
}

// UpsertSkills godoc
// @Summary Upload skills into container
// @Tags containerd
// @Param bot_id path string true "Bot ID"
// @Param payload body SkillsUpsertRequest true "Skills payload"
// @Success 200 {object} skillsOpResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /bots/{bot_id}/container/skills [post]
func (h *ContainerdHandler) UpsertSkills(c echo.Context) error {
	botID, err := h.requireBotAccess(c)
	if err != nil {
		return err
	}
	var req SkillsUpsertRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	if len(req.Skills) == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "skills is required")
	}

	ctx := c.Request().Context()
	containerID, err := h.botContainerID(ctx, botID)
	if err != nil {
		return err
	}
	if err := h.ensureTaskRunning(ctx, containerID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}
	for _, skill := range req.Skills {
		name := strings.TrimSpace(skill.Name)
		if !isValidSkillName(name) {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid skill name")
		}
		content := strings.TrimSpace(skill.Content)
		if content == "" {
			content = buildSkillContent(name, strings.TrimSpace(skill.Description))
		}
		filePath := path.Join(".skills", name, "SKILL.md")
		if _, err := h.callMCPTool(ctx, containerID, "write", map[string]any{
			"path":    filePath,
			"content": content,
		}); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
	}

	return c.JSON(http.StatusOK, skillsOpResponse{OK: true})
}

// DeleteSkills godoc
// @Summary Delete skills from container
// @Tags containerd
// @Param bot_id path string true "Bot ID"
// @Param payload body SkillsDeleteRequest true "Delete skills payload"
// @Success 200 {object} skillsOpResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /bots/{bot_id}/container/skills [delete]
func (h *ContainerdHandler) DeleteSkills(c echo.Context) error {
	botID, err := h.requireBotAccess(c)
	if err != nil {
		return err
	}
	var req SkillsDeleteRequest
	if err := c.Bind(&req); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	}
	if len(req.Names) == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "names is required")
	}

	ctx := c.Request().Context()
	containerID, err := h.botContainerID(ctx, botID)
	if err != nil {
		return err
	}
	if err := h.ensureTaskRunning(ctx, containerID); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
	}

	for _, name := range req.Names {
		skillName := strings.TrimSpace(name)
		if !isValidSkillName(skillName) {
			return echo.NewHTTPError(http.StatusBadRequest, "invalid skill name")
		}
		deletePath := path.Join(".skills", skillName)
		if _, err := h.callMCPTool(ctx, containerID, "delete", map[string]any{
			"path": deletePath,
		}); err != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, err.Error())
		}
	}

	return c.JSON(http.StatusOK, skillsOpResponse{OK: true})
}

// LoadSkills loads all skills from the container for the given bot.
// This implements chat.SkillLoader.
func (h *ContainerdHandler) LoadSkills(ctx context.Context, botID string) ([]SkillItem, error) {
	containerID, err := h.botContainerID(ctx, botID)
	if err != nil {
		return nil, err
	}
	if err := h.ensureTaskRunning(ctx, containerID); err != nil {
		return nil, err
	}
	if err := h.ensureSkillsDirHost(botID); err != nil {
		return nil, err
	}

	listPayload, err := h.callMCPTool(ctx, containerID, "list", map[string]any{
		"path":      ".skills",
		"recursive": false,
	})
	if err != nil {
		return nil, err
	}
	entries, err := extractListEntries(listPayload)
	if err != nil {
		return nil, err
	}

	skills := make([]SkillItem, 0, len(entries))
	for _, entry := range entries {
		skillPath, name := skillPathForEntry(entry)
		if skillPath == "" {
			continue
		}
		raw, err := h.readSkillFile(ctx, containerID, skillPath)
		if err != nil {
			continue
		}
		parsed := parseSkillFile(raw, name)
		skills = append(skills, SkillItem{
			Name:        parsed.Name,
			Description: parsed.Description,
			Content:     parsed.Content,
			Metadata:    parsed.Metadata,
		})
	}
	return skills, nil
}

func (h *ContainerdHandler) ensureSkillsDirHost(botID string) error {
	dataRoot := strings.TrimSpace(h.cfg.DataRoot)
	if dataRoot == "" {
		dataRoot = config.DefaultDataRoot
	}
	skillsDir := path.Join(dataRoot, "bots", botID, ".skills")
	return os.MkdirAll(skillsDir, 0o755)
}

func (h *ContainerdHandler) readSkillFile(ctx context.Context, containerID, filePath string) (string, error) {
	payload, err := h.callMCPTool(ctx, containerID, "read", map[string]any{
		"path": filePath,
	})
	if err != nil {
		return "", err
	}
	content, err := extractContentString(payload)
	if err != nil {
		return "", err
	}
	return content, nil
}

func (h *ContainerdHandler) callMCPTool(ctx context.Context, containerID, toolName string, args map[string]any) (map[string]any, error) {
	id := "skills-" + strconv.FormatInt(time.Now().UnixNano(), 10)
	req, err := mcptools.NewToolCallRequest(id, toolName, args)
	if err != nil {
		return nil, err
	}
	payload, err := h.callMCPServer(ctx, containerID, req)
	if err != nil {
		return nil, err
	}
	if err := mcptools.PayloadError(payload); err != nil {
		return nil, err
	}
	if err := mcptools.ResultError(payload); err != nil {
		return nil, err
	}
	return payload, nil
}

func extractListEntries(payload map[string]any) ([]skillEntry, error) {
	result, err := mcptools.StructuredContent(payload)
	if err != nil {
		return nil, err
	}
	rawEntries, ok := result["entries"].([]any)
	if !ok {
		return nil, errors.New("invalid list response")
	}
	entries := make([]skillEntry, 0, len(rawEntries))
	for _, raw := range rawEntries {
		entryMap, ok := raw.(map[string]any)
		if !ok {
			continue
		}
		entryPath, _ := entryMap["path"].(string)
		if entryPath == "" {
			continue
		}
		isDir, _ := entryMap["is_dir"].(bool)
		entries = append(entries, skillEntry{Path: entryPath, IsDir: isDir})
	}
	return entries, nil
}

type skillEntry struct {
	Path  string
	IsDir bool
}

func extractContentString(payload map[string]any) (string, error) {
	result, err := mcptools.StructuredContent(payload)
	if err != nil {
		return "", err
	}
	content, _ := result["content"].(string)
	if content == "" {
		return "", errors.New("empty content")
	}
	return content, nil
}

func skillNameFromPath(rel string) string {
	if rel == "" || rel == "SKILL.md" {
		return "default"
	}
	parent := path.Dir(rel)
	if parent == "." {
		return "default"
	}
	return path.Base(parent)
}

func skillPathForEntry(entry skillEntry) (string, string) {
	rel := strings.TrimPrefix(entry.Path, ".skills/")
	if rel == entry.Path {
		rel = strings.TrimPrefix(entry.Path, "./.skills/")
	}
	if entry.IsDir {
		name := path.Base(rel)
		if name == "." || name == "" {
			return "", ""
		}
		return path.Join(".skills", name, "SKILL.md"), name
	}
	if path.Base(rel) == "SKILL.md" {
		return path.Join(".skills", "SKILL.md"), skillNameFromPath(rel)
	}
	return "", ""
}

// parsedSkill holds the result of parsing a SKILL.md file with YAML frontmatter.
type parsedSkill struct {
	Name        string
	Description string
	Content     string         // body after frontmatter
	Metadata    map[string]any // "metadata" key from frontmatter
}

// parseSkillFile parses a SKILL.md file with YAML frontmatter delimited by "---".
// Format:
//
//	---
//	name: your-skill-name
//	description: Brief description
//	metadata:
//	  key: value
//	---
//	# Body content ...
func parseSkillFile(raw string, fallbackName string) parsedSkill {
	result := parsedSkill{Name: fallbackName}

	trimmed := strings.TrimSpace(raw)
	if !strings.HasPrefix(trimmed, "---") {
		return result
	}

	// Find closing "---".
	rest := trimmed[3:]
	rest = strings.TrimLeft(rest, " \t")
	if len(rest) > 0 && rest[0] == '\n' {
		rest = rest[1:]
	} else if len(rest) > 1 && rest[0] == '\r' && rest[1] == '\n' {
		rest = rest[2:]
	}
	closingIdx := strings.Index(rest, "\n---")
	if closingIdx < 0 {
		return result
	}

	frontmatterRaw := rest[:closingIdx]
	body := rest[closingIdx+4:]
	body = strings.TrimLeft(body, "\r\n")
	result.Content = body

	var fm struct {
		Name        string         `yaml:"name"`
		Description string         `yaml:"description"`
		Metadata    map[string]any `yaml:"metadata"`
	}
	if err := yaml.Unmarshal([]byte(frontmatterRaw), &fm); err != nil {
		return result
	}

	if strings.TrimSpace(fm.Name) != "" {
		result.Name = strings.TrimSpace(fm.Name)
	}
	result.Description = strings.TrimSpace(fm.Description)
	result.Metadata = fm.Metadata

	return result
}

func buildSkillContent(name, description string) string {
	if description == "" {
		description = name
	}
	return "---\nname: " + name + "\ndescription: " + description + "\n---\n\n# " + name + "\n\n" + description
}

func isValidSkillName(name string) bool {
	if name == "" {
		return false
	}
	if strings.Contains(name, "..") {
		return false
	}
	if strings.Contains(name, "/") || strings.Contains(name, "\\") {
		return false
	}
	return true
}
