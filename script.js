"use strict";

/* ========================================
   QuickNotes — Application logic
   ======================================== */
const STORAGE_KEY = "quicknotes-notes-v1";
const THEME_KEY = "theme";

// Get the HTML elements we need.
const noteForm = document.getElementById("note-form");
const titleInput = document.getElementById("note-title");
const contentInput = document.getElementById("note-content");
const categoryInput = document.getElementById("note-category");
const searchInput = document.getElementById("note-search");
const notesList = document.getElementById("notes-list");
const notesCount = document.getElementById("notes-count");
const emptyState = document.getElementById("empty-state");
const formMessage = document.getElementById("form-message");
const themeToggle = document.querySelector("#theme-toggle");

// The app keeps its current notes in memory.
let notes = loadNotes();

/* ========================================
   Storage
   ======================================== */
function loadNotes() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) {
      return [];
    }
    const parsedData = JSON.parse(savedData);
    // Reject unexpected or malformed stored data.
    if (!Array.isArray(parsedData)) {
      return [];
    }
    return parsedData.filter((note) => 
      note && 
      typeof note.id === "string" && 
      typeof note.title === "string" && 
      typeof note.content === "string" && 
      typeof note.category === "string" && 
      typeof note.createdAt === "string"
    );
  } catch (error) {
    console.error("Could not load saved notes:", error);
    return [];
  }
}

function saveNotes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    return true;
  } catch (error) {
    console.error("Could not save notes:", error);
    return false;
  }
}

/* ========================================
   Helpers
   ======================================== */
function createId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function getCategoryName(category) {
  const categories = { personal: "Personal", school: "School", work: "Work", ideas: "Ideas" };
  return categories[category] || "Other";
}

function showMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.style.color = isError ? "#dc2626" : "#15803d";
}

/* ========================================
   Create a note
   ======================================== */
if (noteForm) {
  noteForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const category = categoryInput.value;

    if (!title || !content) {
      showMessage("Please enter both a title and note.", true);
      return;
    }
    if (title.length > 80) {
      showMessage("The title cannot exceed 80 characters.", true);
      return;
    }
    if (!["personal", "school", "work", "ideas"].includes(category)) {
      showMessage("Please select a valid category.", true);
      return;
    }

    const newNote = {
      id: createId(),
      title: title,
      content: content,
      category: category,
      createdAt: new Date().toISOString()
    };

    // Add the new note to the beginning of the list.
    notes.unshift(newNote);
    const saved = saveNotes();

    // Clear the search so the new note is visible.
    if (searchInput) searchInput.value = "";
    renderNotes();
    noteForm.reset();
    if (titleInput) titleInput.focus();

    if (saved) {
      showMessage("Note added successfully.");
    } else {
      showMessage("Note added for this session, but it could not be saved permanently.", true);
    }
  });
}

/* ========================================
   Display notes
   ======================================== */
function renderNotes() {
  if (!notesList) return;
  
  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const filteredNotes = notes.filter((note) => {
    return (
      note.title.toLowerCase().includes(searchTerm) || 
      note.content.toLowerCase().includes(searchTerm)
    );
  });

  // Clear the existing list before rebuilding it.
  notesList.replaceChildren();

  filteredNotes.forEach((note) => {
    const listItem = document.createElement("li");
    const title = document.createElement("h3");
    title.textContent = note.title;
    
    const category = document.createElement("p");
    category.textContent = `Category: ${getCategoryName(note.category)}`;
    
    const content = document.createElement("p");
    content.textContent = note.content;
    content.style.whiteSpace = "pre-wrap";
    
    const date = document.createElement("small");
    date.textContent = `Created: ${formatDate(note.createdAt)}`;
    
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete note: ${note.title}`);
    deleteButton.dataset.action = "delete";
    deleteButton.dataset.id = note.id;
    deleteButton.style.marginTop = "14px";
    deleteButton.style.backgroundColor = "#dc2626";

    listItem.append(title, category, content, date, deleteButton);
    notesList.appendChild(listItem);
  });

  // Update the counter.
  if (notesCount) {
    if (searchTerm) {
      notesCount.textContent = `Showing ${filteredNotes.length} of ${notes.length} notes`;
    } else {
      notesCount.textContent = `Notes: ${notes.length}`;
    }
  }

  // Update the empty-state message.
  if (emptyState) {
    if (filteredNotes.length === 0 && notes.length === 0) {
      emptyState.textContent = "No notes yet. Add your first note above.";
      emptyState.hidden = false;
    } else if (filteredNotes.length === 0) {
      emptyState.textContent = "No matching notes found. Try another search.";
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
    }
  }
}

/* ========================================
   Search notes
   ======================================== */
if (searchInput) {
  searchInput.addEventListener("input", function () {
    renderNotes();
  });
}

/* ========================================
   Delete notes
   ======================================== */
if (notesList) {
  notesList.addEventListener("click", function (event) {
    const button = event.target.closest('button[data-action="delete"]');
    if (!button || !notesList.contains(button)) {
      return;
    }

    const noteId = button.dataset.id;
    const noteToDelete = notes.find((note) => note.id === noteId);
    if (!noteToDelete) {
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete "${noteToDelete.title}"?`);
    if (!confirmed) {
      return;
    }

    const previousNotes = notes;
    notes = notes.filter((note) => note.id !== noteId);

    if (!saveNotes()) {
      // Keep the original note if persistence fails.
      notes = previousNotes;
      showMessage("The note could not be deleted because changes could not be saved.", true);
      return;
    }

    renderNotes();
    showMessage("Note deleted successfully.");
  });
}

/* ========================================
   Theme Logic (Fixed & Isolated)
   ======================================== */
function updateThemeButton() {
  if (themeToggle) {
    themeToggle.textContent = document.body.classList.contains("dark") ? "Light mode" : "Dark mode";
  }
}

function saveTheme() {
  const theme = document.body.classList.contains("dark") ? "dark" : "light";
  localStorage.setItem(THEME_KEY, theme);
}

if (themeToggle) {
  themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("dark");
    updateThemeButton();
    saveTheme();
  });
}

/* ========================================
   Initialize the application
   ======================================== */
// Restore the selected theme.
const savedTheme = localStorage.getItem(THEME_KEY);
if (savedTheme === "dark") {
  document.body.classList.add("dark");
} else {
  document.body.classList.remove("dark");
}

updateThemeButton();
renderNotes();
