'use strict';

const STORAGE_KEY = 'taskflow_tasks';

/** @type {{id: number, text: string, completed: boolean}[]} */
let tasks = [];
let currentFilter = 'all'; // 'all' | 'active' | 'completed'

const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const emptyState = document.getElementById('empty-state');
const taskCounter = document.getElementById('task-counter');
const clearCompletedBtn = document.getElementById('clear-completed-btn');
const filterButtons = document.querySelectorAll('.filter-btn');
const currentYearEl = document.getElementById('current-year');

/**
 * Load tasks from localStorage into the state array.
 * Falls back to an empty array if nothing is stored or data is corrupt.
 */
const loadTasks = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    tasks = stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load tasks from localStorage:', error);
    tasks = [];
  }
};

/**
 * Persist the current tasks array to localStorage.
 */
const saveTasks = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Failed to save tasks to localStorage:', error);
  }
};

/**
 * Generate a unique numeric ID for a new task.
 * @returns {number}
 */
const generateId = () => (tasks.length ? Math.max(...tasks.map((t) => t.id)) + 1 : 1);

/**
 * Return the tasks array filtered according to currentFilter.
 * @returns {{id:number, text:string, completed:boolean}[]}
 */
const filterTasks = () => {
  switch (currentFilter) {
    case 'active':
      return tasks.filter((task) => !task.completed);
    case 'completed':
      return tasks.filter((task) => task.completed);
    default:
      return tasks;
  }
};

/**
 * Escape HTML special characters to prevent injection when rendering task text.
 * @param {string} str
 * @returns {string}
 */
const escapeHtml = (str) =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/**
 * Render the (filtered) task list to the DOM, update empty state
 * and the task counter.
 */
const renderTasks = () => {
  const visibleTasks = filterTasks();

  // Toggle empty state visibility
  if (visibleTasks.length === 0) {
    taskList.innerHTML = '';
    emptyState.classList.add('visible');
  } else {
    emptyState.classList.remove('visible');

    taskList.innerHTML = visibleTasks
      .map(
        (task) => `
      <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
        <button
          type="button"
          class="task-checkbox ${task.completed ? 'checked' : ''}"
          data-action="toggle"
          aria-label="${task.completed ? 'Mark task as active' : 'Mark task as completed'}"
          aria-pressed="${task.completed}"
        ></button>
        <span class="task-text">${escapeHtml(task.text)}</span>
        <div class="task-actions">
          <button type="button" class="task-action-btn edit-btn" data-action="edit" aria-label="Edit task">✎</button>
          <button type="button" class="task-action-btn delete-btn" data-action="delete" aria-label="Delete task">🗑</button>
        </div>
      </li>
    `
      )
      .join('');
  }

  updateCounter();
};

/**
 * Update the "X tasks left" counter and enable/disable the
 * Clear Completed button.
 */
const updateCounter = () => {
  const activeCount = tasks.filter((task) => !task.completed).length;
  const completedCount = tasks.filter((task) => task.completed).length;

  taskCounter.textContent = `${activeCount} ${activeCount === 1 ? 'task' : 'tasks'} left`;

  clearCompletedBtn.disabled = completedCount === 0;
};

/**
 * Add a new task from the input field's value.
 * Validates against empty / whitespace-only input.
 */
const addTask = () => {
  const text = taskInput.value.trim();

  if (!text) {
    taskInput.focus();
    return;
  }

  const newTask = {
    id: generateId(),
    text,
    completed: false,
  };

  tasks.unshift(newTask);
  taskInput.value = '';
  taskInput.focus();

  saveTasks();
  renderTasks();
};

/**
 * Delete a task by its ID, with a small exit animation.
 * @param {number} id
 */
const deleteTask = (id) => {
  const taskEl = taskList.querySelector(`[data-id="${id}"]`);

  const removeFromState = () => {
    tasks = tasks.filter((task) => task.id !== id);
    saveTasks();
    renderTasks();
  };

  if (taskEl) {
    taskEl.classList.add('removing');
    taskEl.addEventListener('animationend', removeFromState, { once: true });
  } else {
    removeFromState();
  }
};

/**
 * Edit a task's text via a prompt dialog.
 * Validates against empty / whitespace-only input.
 * @param {number} id
 */
const editTask = (id) => {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const updatedText = window.prompt('Edit task:', task.text);

  // User cancelled the prompt
  if (updatedText === null) return;

  const trimmed = updatedText.trim();
  if (!trimmed) return;

  task.text = trimmed;
  saveTasks();
  renderTasks();
};

/**
 * Toggle a task's completed state by ID.
 * @param {number} id
 */
const toggleTask = (id) => {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  saveTasks();
  renderTasks();
};

/**
 * Remove all completed tasks from the list.
 */
const clearCompleted = () => {
  const hasCompleted = tasks.some((task) => task.completed);
  if (!hasCompleted) return;

  tasks = tasks.filter((task) => !task.completed);
  saveTasks();
  renderTasks();
};

/**
 * Handle form submission (Add Task button / Enter key).
 */
taskForm.addEventListener('submit', (event) => {
  event.preventDefault();
  addTask();
});

/**
 * Event delegation: a single listener on the task list handles
 * toggle / edit / delete for every task, present or future.
 */
taskList.addEventListener('click', (event) => {
  const actionBtn = event.target.closest('[data-action]');
  if (!actionBtn) return;

  const taskItem = event.target.closest('.task-item');
  if (!taskItem) return;

  const id = Number(taskItem.dataset.id);
  const action = actionBtn.dataset.action;

  switch (action) {
    case 'toggle':
      toggleTask(id);
      break;
    case 'edit':
      editTask(id);
      break;
    case 'delete':
      deleteTask(id);
      break;
    default:
      break;
  }
});

/**
 * Filter button clicks: update currentFilter and re-render.
 */
filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});

/**
 * Clear Completed button.
 */
clearCompletedBtn.addEventListener('click', clearCompleted);

/**
 * Bootstraps the application: loads stored tasks, renders them,
 * and sets up any one-time UI values (like footer year).
 */
const initializeApp = () => {
  loadTasks();
  renderTasks();
  currentYearEl.textContent = new Date().getFullYear();
};

document.addEventListener('DOMContentLoaded', initializeApp);