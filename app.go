package main

import (
	"context"
	"log"
	"os"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx   context.Context
	tasks *taskStore
}

// NewApp creates a new App application struct
func NewApp() *App {
	store, err := newTaskStore()

	if err != nil {
		log.Fatalf("failed to initialise task store: %v", err)
	}

	return &App{tasks: store}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// ListTasks returns every task currently on the matrix.
func (a *App) ListTasks() []Task {
	return a.tasks.list()
}

// CreateTask adds a new, untitled task to the given quadrant at the given
// relative position (0-1 within the quadrant) and returns it.
func (a *App) CreateTask(quadrant Quadrant, x float64, y float64) (Task, error) {
	return a.tasks.create(quadrant, x, y)
}

// UpdateTaskTitle renames an existing task.
func (a *App) UpdateTaskTitle(id string, title string) (Task, error) {
	return a.tasks.update(id, title)
}

// MoveTask relocates a task to a new quadrant and/or position.
func (a *App) MoveTask(id string, quadrant Quadrant, x float64, y float64) (Task, error) {
	return a.tasks.move(id, quadrant, x, y)
}

// DeleteTask removes a task from the matrix.
func (a *App) DeleteTask(id string) error {
	return a.tasks.delete(id)
}

// ClearTasks removes every task from the matrix.
func (a *App) ClearTasks() error {
	return a.tasks.clear()
}

// BulkCreateTasks adds every given task to the matrix in a single persist
// operation. Used by markdown import.
func (a *App) BulkCreateTasks(inputs []NewTask) ([]Task, error) {
	return a.tasks.bulkCreate(inputs)
}

// BulkDeleteTasks removes every task with a matching ID in a single persist
// operation. Used to undo a markdown import.
func (a *App) BulkDeleteTasks(ids []string) error {
	return a.tasks.bulkDelete(ids)
}

// ImportMarkdown prompts the user to pick a markdown file via a native file
// dialog and returns its raw contents for the frontend to parse. An empty
// string with a nil error means the user cancelled the dialog.
func (a *App) ImportMarkdown() (string, error) {
	path, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Import matrix from markdown",
		Filters: []runtime.FileFilter{
			{DisplayName: "Markdown (*.md, *.markdown)", Pattern: "*.md;*.markdown"},
			{DisplayName: "All Files (*.*)", Pattern: "*.*"},
		},
	})

	if err != nil {
		return "", err
	}

	if path == "" {
		return "", nil
	}

	data, err := os.ReadFile(path)

	if err != nil {
		return "", err
	}

	return string(data), nil
}

// ExportMarkdown prompts the user for a destination via a native save
// dialog and writes the given markdown content there. It returns false if
// the user cancelled the dialog.
func (a *App) ExportMarkdown(content string) (bool, error) {
	path, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "Export matrix to markdown",
		DefaultFilename: "eisenhower-matrix.md",
		Filters: []runtime.FileFilter{
			{DisplayName: "Markdown (*.md)", Pattern: "*.md"},
		},
	})

	if err != nil {
		return false, err
	}

	if path == "" {
		return false, nil
	}

	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		return false, err
	}

	return true, nil
}
