import {
  setupMenuHandlers,
  setupKeyboardShortcuts,
  setupAddTabButton,
} from "./menuHandlers";
import { setupPanelResizing } from "../components/panelResizer";
import { initializeTheme } from "../components/theme";
import {
  initializeFolderTreeHandlers,
  createNewFileToolbar,
  toggleBigOpenFolderButton,
} from "../components/folderTree";
import { setupTextFormattingButtons } from "../utils/textFormatting";
import { initializeSelectionToolbar } from "../utils/selectionToolbar";
import { initializePreviewSync } from "../markdown/previewSync";
import { initializeChat } from "../ai/chat";
import { initializeModelSelection } from "../ai/modelSelection";
import { initializeOllamaCheck } from "../ai/ollamaCheck";
import { createNewTab } from "../utils/tabManagement";
import { initializeMarkdownInputHandlers } from "./markdownHandlers";

export function initializeApplication(): void {
  // Setup core handlers
  setupMenuHandlers();
  setupKeyboardShortcuts();
  setupAddTabButton();

  // Setup UI components
  setupPanelResizing();
  initializeTheme();

  // Setup folder tree functionality
  initializeFolderTreeHandlers();
  createNewFileToolbar();

  // Setup text formatting
  setupTextFormattingButtons();
  initializeSelectionToolbar();

  // Setup markdown preview sync
  initializePreviewSync();

  // Setup AI features
  initializeChat();
  initializeModelSelection();

  // Setup markdown input handlers
  initializeMarkdownInputHandlers();

  // Create initial tab
  createNewTab(null, "");

  // Initialize folder display
  toggleBigOpenFolderButton();

  // Check Ollama availability (this should be last)
  initializeOllamaCheck();
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApplication);
} else {
  initializeApplication();
}
