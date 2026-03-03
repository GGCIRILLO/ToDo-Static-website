/* ============================================
   KANBAN BOARD — APP LOGIC
   Drag & Drop · CRUD · localStorage
   ============================================ */

(function () {
  "use strict";

  // --- State ---
  const STORAGE_KEY = "kanban-board-tasks";

  function loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  let tasks = loadTasks();

  // --- DOM Refs ---
  const taskInput = document.getElementById("taskInput");
  const addTaskBtn = document.getElementById("addTaskBtn");
  const lists = {
    todo: document.getElementById("list-todo"),
    inprogress: document.getElementById("list-inprogress"),
    done: document.getElementById("list-done"),
  };
  const counts = {
    todo: document.getElementById("count-todo"),
    inprogress: document.getElementById("count-inprogress"),
    done: document.getElementById("count-done"),
  };
  const columns = document.querySelectorAll(".column");

  // --- Utility ---
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  // --- Render ---
  function render() {
    // Clear lists
    Object.values(lists).forEach((list) => {
      list.innerHTML = "";
    });

    // Group tasks by status
    const grouped = { todo: [], inprogress: [], done: [] };
    tasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    // Render each group
    Object.entries(grouped).forEach(([status, group]) => {
      if (group.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        empty.textContent =
          status === "todo"
            ? "No tasks yet — add one above!"
            : status === "inprogress"
              ? "Drag tasks here to start"
              : "Completed tasks appear here";
        lists[status].appendChild(empty);
      } else {
        group.forEach((task) => {
          lists[status].appendChild(createCard(task));
        });
      }
    });

    // Update counts
    Object.entries(grouped).forEach(([status, group]) => {
      counts[status].textContent = group.length;
    });
  }

  function createCard(task) {
    const card = document.createElement("div");
    card.className = "task-card";
    card.setAttribute("draggable", "true");
    card.dataset.id = task.id;

    const text = document.createElement("span");
    text.className = "task-text" + (task.status === "done" ? " done-text" : "");
    text.textContent = task.text;

    const actions = document.createElement("div");
    actions.className = "task-actions";

    // Edit button
    const editBtn = document.createElement("button");
    editBtn.className = "edit-btn";
    editBtn.setAttribute("aria-label", "Edit task");
    editBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.33 2.67a1.41 1.41 0 0 1 2 2L5.5 12.5l-3 .75.75-3 7.08-7.58Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      startEdit(card, task);
    });

    // Delete button
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.setAttribute("aria-label", "Delete task");
    deleteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteTask(card, task.id);
    });

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(text);
    card.appendChild(actions);

    // Drag events on card
    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragend", handleDragEnd);

    return card;
  }

  // --- Add Task ---
  function addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const task = {
      id: generateId(),
      text: trimmed,
      status: "todo",
      createdAt: Date.now(),
    };

    tasks.push(task);
    saveTasks(tasks);
    render();
    taskInput.value = "";
    taskInput.focus();
  }

  addTaskBtn.addEventListener("click", () => addTask(taskInput.value));
  taskInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addTask(taskInput.value);
  });

  // --- Delete Task ---
  function deleteTask(card, id) {
    card.classList.add("removing");
    card.addEventListener(
      "animationend",
      () => {
        tasks = tasks.filter((t) => t.id !== id);
        saveTasks(tasks);
        render();
      },
      { once: true },
    );
  }

  // --- Edit Task ---
  function startEdit(card, task) {
    const textEl = card.querySelector(".task-text");
    const actionsEl = card.querySelector(".task-actions");
    if (!textEl) return;

    // Replace text with input
    const input = document.createElement("input");
    input.type = "text";
    input.className = "task-edit-input";
    input.value = task.text;

    textEl.replaceWith(input);
    actionsEl.style.display = "none";
    card.setAttribute("draggable", "false");
    input.focus();
    input.select();

    function commit() {
      const newText = input.value.trim();
      if (newText && newText !== task.text) {
        task.text = newText;
        saveTasks(tasks);
      }
      render();
    }

    input.addEventListener("blur", commit, { once: true });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        input.removeEventListener("blur", commit);
        commit();
      }
      if (e.key === "Escape") {
        input.removeEventListener("blur", commit);
        render();
      }
    });
  }

  // --- Drag & Drop ---
  let draggedId = null;

  function handleDragStart(e) {
    draggedId = e.currentTarget.dataset.id;
    e.currentTarget.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", draggedId);

    // Slight delay so the browser snapshot is taken before we dim
    requestAnimationFrame(() => {
      e.currentTarget.style.opacity = "0.5";
    });
  }

  function handleDragEnd(e) {
    e.currentTarget.classList.remove("dragging");
    e.currentTarget.style.opacity = "";
    draggedId = null;
    clearAllDragOver();
  }

  function clearAllDragOver() {
    columns.forEach((col) => col.classList.remove("drag-over"));
    document.querySelectorAll(".drop-placeholder").forEach((el) => el.remove());
  }

  // Column drop zone events
  columns.forEach((col) => {
    const list = col.querySelector(".task-list");

    col.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      col.classList.add("drag-over");

      // Add placeholder if not present
      if (!list.querySelector(".drop-placeholder")) {
        const ph = document.createElement("div");
        ph.className = "drop-placeholder";
        list.appendChild(ph);
      }
    });

    col.addEventListener("dragleave", (e) => {
      // Only clear when leaving the column entirely
      if (!col.contains(e.relatedTarget)) {
        col.classList.remove("drag-over");
        const ph = list.querySelector(".drop-placeholder");
        if (ph) ph.remove();
      }
    });

    col.addEventListener("drop", (e) => {
      e.preventDefault();
      clearAllDragOver();

      const id = e.dataTransfer.getData("text/plain");
      const newStatus = list.dataset.status;

      const task = tasks.find((t) => t.id === id);
      if (task && task.status !== newStatus) {
        task.status = newStatus;
        saveTasks(tasks);
        render();
      }
    });
  });

  // --- Init ---
  render();
})();
