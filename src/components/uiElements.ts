// Get references to DOM elements
export const markdownInput = document.getElementById(
  "markdown-input",
) as HTMLTextAreaElement;
export const markdownPreview = document.getElementById(
  "markdown-preview",
) as HTMLDivElement;
export const tabsContainer = document.getElementById("tabs") as HTMLDivElement;
export const statusMsg = document.getElementById(
  "status-msg",
) as HTMLSpanElement;

export const openFolderButton = document.getElementById(
  "open-folder",
) as HTMLButtonElement;
export const newFileButton = document.getElementById(
  "new-file",
) as HTMLButtonElement;
export const newFolderButton = document.getElementById(
  "new-folder",
) as HTMLButtonElement;
export const folderTreeContainer = document.getElementById(
  "folder-tree",
) as HTMLDivElement;

export const openFolderBigContainer = document.getElementById(
  "open-folder-big",
) as HTMLDivElement;
export const openFolderBigButton = document.getElementById(
  "open-folder-big-btn",
) as HTMLButtonElement;

export const selectionToolbar = document.getElementById(
  "selection-toolbar",
) as HTMLDivElement;
export const selectionEditButton = document.getElementById(
  "selection-edit-ai",
) as HTMLButtonElement;
export const selectionModal = document.getElementById(
  "selection-ai-modal",
) as HTMLDivElement;
export const selectedTextPreview = document.getElementById(
  "selected-text-preview",
) as HTMLParagraphElement;
export const selectionPromptInput = document.getElementById(
  "selection-ai-prompt",
) as HTMLInputElement;
export const selectionResponseTextarea = document.getElementById(
  "selection-ai-response",
) as HTMLTextAreaElement;
export const acceptSelectionButton = document.getElementById(
  "accept-selection",
) as HTMLButtonElement;
export const rejectSelectionButton = document.getElementById(
  "reject-selection",
) as HTMLButtonElement;
export const closeSelectionModal = document.getElementById(
  "close-selection-modal",
) as HTMLSpanElement;

export const sendChatButton = document.getElementById(
  "send-chat",
) as HTMLButtonElement;
export const chatInputBox = document.getElementById(
  "chat-box",
) as HTMLInputElement;
export const chatHistoryDiv = document.getElementById(
  "chat-history",
) as HTMLDivElement;

export const themeToggleButton = document.getElementById(
  "toggle-theme",
) as HTMLButtonElement;
export const sunIcon = themeToggleButton?.querySelector(
  ".fa-sun",
) as HTMLElement;
export const moonIcon = themeToggleButton?.querySelector(
  ".fa-moon",
) as HTMLElement;

export const modelSelectDropdown = document.getElementById(
  "ollama-model-select",
) as HTMLSelectElement;
