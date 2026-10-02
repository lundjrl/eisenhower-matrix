package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Quadrant identifies one cell of the Eisenhower matrix.
type Quadrant int

const (
	QuadrantUrgentImportant    Quadrant = iota + 1 // Q1: top-left, important & urgent
	QuadrantImportantNotUrgent                     // Q2: top-right, important & not urgent
	QuadrantUrgentNotImportant                     // Q3: bottom-left, urgent & not important
	QuadrantNeither                                // Q4: bottom-right, neither
)

// Task is a single item placed on the matrix. X and Y are relative
// coordinates (0-1) within their quadrant, so layout survives resizing.
type Task struct {
	ID        string   `json:"id"`
	Title     string   `json:"title"`
	Quadrant  Quadrant `json:"quadrant"`
	X         float64  `json:"x"`
	Y         float64  `json:"y"`
	CreatedAt int64    `json:"createdAt"`
}

// NewTask describes a task to be created in bulk, eg. from a markdown
// import. Unlike Task, it carries no ID or CreatedAt -- those are assigned
// by the store.
type NewTask struct {
	Title    string   `json:"title"`
	Quadrant Quadrant `json:"quadrant"`
	X        float64  `json:"x"`
	Y        float64  `json:"y"`
}

type taskStore struct {
	mu    sync.Mutex
	path  string
	tasks map[string]Task
}

func newTaskStore() (*taskStore, error) {
	dir, err := os.UserConfigDir()

	if err != nil {
		return nil, err
	}

	appDir := filepath.Join(dir, "eisenhower-matrix")

	if err := os.MkdirAll(appDir, 0o755); err != nil {
		return nil, err
	}

	store := &taskStore{
		path:  filepath.Join(appDir, "tasks.json"),
		tasks: map[string]Task{},
	}

	if err := store.load(); err != nil {
		return nil, err
	}

	return store, nil
}

func (s *taskStore) load() error {
	data, err := os.ReadFile(s.path)

	if os.IsNotExist(err) {
		return nil
	}

	if err != nil {
		return err
	}

	var tasks []Task

	if err := json.Unmarshal(data, &tasks); err != nil {
		return err
	}

	for _, t := range tasks {
		s.tasks[t.ID] = t
	}

	return nil
}

func (s *taskStore) persist() error {
	tasks := make([]Task, 0, len(s.tasks))

	for _, t := range s.tasks {
		tasks = append(tasks, t)
	}

	data, err := json.MarshalIndent(tasks, "", "  ")

	if err != nil {
		return err
	}

	return os.WriteFile(s.path, data, 0o644)
}

func (s *taskStore) list() []Task {
	s.mu.Lock()
	defer s.mu.Unlock()

	tasks := make([]Task, 0, len(s.tasks))

	for _, t := range s.tasks {
		tasks = append(tasks, t)
	}

	return tasks
}

func (s *taskStore) create(quadrant Quadrant, x, y float64) (Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	task := Task{
		ID:        uuid.NewString(),
		Quadrant:  quadrant,
		X:         x,
		Y:         y,
		CreatedAt: time.Now().Unix(),
	}

	s.tasks[task.ID] = task

	return task, s.persist()
}

func (s *taskStore) update(id, title string) (Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	task, ok := s.tasks[id]

	if !ok {
		return Task{}, fmt.Errorf("task not found: %s", id)
	}

	task.Title = title
	s.tasks[id] = task

	return task, s.persist()
}

func (s *taskStore) move(id string, quadrant Quadrant, x, y float64) (Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	task, ok := s.tasks[id]

	if !ok {
		return Task{}, fmt.Errorf("task not found: %s", id)
	}

	task.Quadrant = quadrant
	task.X = x
	task.Y = y
	s.tasks[id] = task

	return task, s.persist()
}

func (s *taskStore) clear() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.tasks = map[string]Task{}

	return s.persist()
}

func (s *taskStore) delete(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.tasks[id]; !ok {
		return fmt.Errorf("task not found: %s", id)
	}

	delete(s.tasks, id)

	return s.persist()
}

// bulkCreate adds every given task in one go, persisting once at the end.
// Used by markdown import, which can add up to 200 tasks at a time.
func (s *taskStore) bulkCreate(inputs []NewTask) ([]Task, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().Unix()
	created := make([]Task, 0, len(inputs))

	for _, input := range inputs {
		task := Task{
			ID:        uuid.NewString(),
			Title:     input.Title,
			Quadrant:  input.Quadrant,
			X:         input.X,
			Y:         input.Y,
			CreatedAt: now,
		}

		s.tasks[task.ID] = task
		created = append(created, task)
	}

	if err := s.persist(); err != nil {
		return nil, err
	}

	return created, nil
}

// bulkDelete removes every task with a matching ID, persisting once at the
// end. Unknown IDs are ignored so undo stays safe even if a task was already
// removed some other way. Used to undo a markdown import.
func (s *taskStore) bulkDelete(ids []string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for _, id := range ids {
		delete(s.tasks, id)
	}

	return s.persist()
}
