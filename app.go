package main

import (
	"context"
	"log"
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
