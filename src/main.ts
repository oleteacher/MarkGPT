import { marked } from "marked";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import "katex/dist/katex.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile, writeFile } from "@tauri-apps/plugin-fs";
import { exit } from "@tauri-apps/plugin-process";
import renderMathInElement from "katex/contrib/auto-render";
import jsPDF from "jspdf";
import { open as openFolderDialog } from "@tauri-apps/plugin-dialog";
import { readDir, exists, mkdir } from "@tauri-apps/plugin-fs";
import { readFile } from "@tauri-apps/plugin-fs";


// Configure marked with syntax highlighting
marked.use({
  extensions: [
    {
      name: "highlight",
      level: "block",
      start: (src: string) => src.match(/^```/)?.index,
      tokenizer(src: string) {
        const rule = /^```(\w+)?\n([\s\S]*?)\n```/;
        const match = rule.exec(src);
        if (match) {
          return {
            type: "highlight",
            raw: match[0],
            lang: match[1],
            text: match[2],
          };
        }
      },
      renderer(token: any) {
        const validLang =
          token.lang && hljs.getLanguage(token.lang) ? token.lang : "plaintext";
        const highlighted = hljs.highlight(token.text, {
          language: validLang,
        }).value;
        return `<pre><code class="hljs language-${validLang}">${highlighted}</code></pre>`;
      },
    },
  ],
});

// UI Elements
const markdownInput = document.getElementById(
  "markdown-input",
) as HTMLTextAreaElement;
const markdownPreview = document.getElementById(
  "markdown-preview",
) as HTMLDivElement;
const tabsContainer = document.getElementById("tabs") as HTMLDivElement;
const statusMsg = document.getElementById("status-msg") as HTMLSpanElement;

const openFolderButton = document.getElementById(
  "open-folder",
) as HTMLButtonElement;
const newFileButton = document.getElementById(
  "new-file",
) as HTMLButtonElement;
const newFolderButton = document.getElementById(
  "new-folder",
) as HTMLButtonElement;
const folderTreeContainer = document.getElementById(
  "folder-tree",
) as HTMLDivElement;

// Create a new toolbar container for new file and new folder buttons below the folder tree
let newToolbar: HTMLDivElement | null = null;
if (folderTreeContainer) {
  newToolbar = document.createElement("div");
  newToolbar.id = "new-file-folder-toolbar";
  newToolbar.style.display = "flex";
  newToolbar.style.justifyContent = "flex-start";
  newToolbar.style.alignItems = "center";
  newToolbar.style.padding = "0.25rem 0.5rem";
  newToolbar.style.borderTop = "1px solid var(--border)";
  newToolbar.style.background = "var(--panel-bg-secondary)";
  newToolbar.style.gap = "0.5rem";

  // Move newFileButton and newFolderButton into this new toolbar
  if (newFileButton) {
    newToolbar.appendChild(newFileButton);
  }
  if (newFolderButton) {
    newToolbar.appendChild(newFolderButton);
  }

  // Insert the new toolbar just below the folder tree
  folderTreeContainer.insertAdjacentElement("afterend", newToolbar);
}
const openFolderBigContainer = document.getElementById(
  "open-folder-big",
) as HTMLDivElement;
const openFolderBigButton = document.getElementById(
  "open-folder-big-btn",
) as HTMLButtonElement;

let currentFolderPath: string | null = null;
let selectedFolderPath: string | null = null;

// Custom input dialog for Tauri (since prompt() is not available)
async function customPrompt(title: string, placeholder: string = ""): Promise<string | null> {
  return new Promise((resolve) => {
    // Create modal overlay
    const modal = document.createElement("div");
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    // Create dialog content
    const dialog = document.createElement("div");
    dialog.style.cssText = `
      background: var(--bg-primary, #ffffff);
      border-radius: 8px;
      padding: 20px;
      min-width: 300px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;

    const titleElement = document.createElement("h3");
    titleElement.textContent = title;
    titleElement.style.cssText = `
      margin: 0 0 15px 0;
      color: var(--text-primary, #333333);
      font-size: 16px;
    `;

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder;
    input.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--border, #cccccc);
      border-radius: 4px;
      font-size: 14px;
      margin-bottom: 15px;
      box-sizing: border-box;
    `;

    const buttonContainer = document.createElement("div");
    buttonContainer.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: flex-end;
    `;

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.style.cssText = `
      padding: 8px 16px;
      border: 1px solid var(--border, #cccccc);
      background: var(--bg-secondary, #f5f5f5);
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;

    const okButton = document.createElement("button");
    okButton.textContent = "OK";
    okButton.style.cssText = `
      padding: 8px 16px;
      border: none;
      background: var(--accent, #007acc);
      color: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;

    // Event handlers
    const closeModal = () => {
      document.body.removeChild(modal);
    };

    cancelButton.onclick = () => {
      resolve(null);
      closeModal();
    };

    okButton.onclick = () => {
      const value = input.value.trim();
      resolve(value || null);
      closeModal();
    };

    input.onkeydown = (event) => {
      if (event.key === "Enter") {
        okButton.click();
      } else if (event.key === "Escape") {
        cancelButton.click();
      }
    };

    // Focus input when modal opens
    setTimeout(() => input.focus(), 100);

    // Assemble dialog
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(okButton);
    dialog.appendChild(titleElement);
    dialog.appendChild(input);
    dialog.appendChild(buttonContainer);
    modal.appendChild(dialog);
    document.body.appendChild(modal);
  });
}

// Function to toggle big open folder button visibility
function toggleBigOpenFolderButton() {
  if (openFolderBigContainer) {
    if (currentFolderPath) {
      // Folder is open, hide big button
      openFolderBigContainer.style.display = "none";
    } else {
      // No folder open, show big button
      openFolderBigContainer.style.display = "flex";
    }
  }
}

// Function to check if a file is already open
function isFileAlreadyOpen(filePath: string): boolean {
  return allTabs.some((tab) => tab.path === filePath);
}


// Function to check if a file is a text file (not binary) by checking encoding instead of extension
async function isTextFile(filePath: string): Promise<boolean> {
  try {
    // Read first 512 bytes of the file using Tauri FS plugin
    const bytes = await readFile(filePath, {});
    const length = Math.min(bytes.length, 512);

    // Check for binary characters (null bytes)
    for (let i = 0; i < length; i++) {
      if (bytes[i] === 0) {
        return false; // Binary file
      }
    }
    return true; // Text file
  } catch (error) {
    console.error("Error checking file encoding:", error);
    // Fallback: treat as binary to be safe
    return false;
  }
}

// Function to create folder tree HTML recursively
async function createFolderTree(path: string, container: HTMLDivElement, depth: number = 0) {
  const MAX_DEPTH = 10; // Prevent infinite recursion
  container.innerHTML = ""; // Clear existing content

  // Prevent excessive recursion
  if (depth > MAX_DEPTH) {
    const errorItem = document.createElement("div");
    errorItem.className = "folder-item error";
    errorItem.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Directory too deep`;
    container.appendChild(errorItem);
    return;
  }

  try {
    // Add root folder item if this is the root folder
    if (path === currentFolderPath) {
      const rootItem = document.createElement("div");
      rootItem.className = "folder-item folder root-folder";

      // Get folder name from path
      const folderName = path.split("/").pop() || path;
      rootItem.innerHTML = `<i class="fas fa-folder"></i> ${folderName}`;

      // Check if root folder is currently selected
      if (selectedFolderPath === currentFolderPath) {
        rootItem.classList.add("selected");
      }

      rootItem.addEventListener("click", (event) => {
        event.stopPropagation();

        // Clear previous selection
        document.querySelectorAll(".folder-item.selected").forEach(el => {
          el.classList.remove("selected");
        });

        // Select root folder
        rootItem.classList.add("selected");
        selectedFolderPath = currentFolderPath;
      });

      container.appendChild(rootItem);
    }

    const entries = await readDir(path);

    for (const entry of entries) {
      const item = document.createElement("div");
      item.className = "folder-item";

      if (entry.isDirectory) {
        // Folder
        item.classList.add("folder");
        item.innerHTML = `<i class="fas fa-folder"></i> ${entry.name}`;

        const subContainer = document.createElement("div");
        subContainer.className = "folder-subtree";
        subContainer.style.display = "none";

        const fullPath = `${path}/${entry.name}`;

        // Check if this folder is currently selected
        if (selectedFolderPath === fullPath) {
          item.classList.add("selected");
        }

        item.addEventListener("click", async (event) => {
          event.stopPropagation(); // Prevent event bubbling

          // Update selection
          const wasSelected = item.classList.contains("selected");

          // Clear previous selection
          document.querySelectorAll(".folder-item.selected").forEach(el => {
            el.classList.remove("selected");
          });

          if (!wasSelected) {
            // Select this folder
            item.classList.add("selected");
            selectedFolderPath = fullPath;
          } else {
            // Deselect - use root folder
            selectedFolderPath = currentFolderPath;
          }

          // Toggle expansion
          if (subContainer.style.display === "none") {
            subContainer.style.display = "block";
            item.innerHTML = `<i class="fas fa-folder-open"></i> ${entry.name}`;
            // Load children if not already loaded
            if (subContainer.children.length === 0) {
              console.log("Loading folder:", fullPath);
              try {
                await createFolderTree(fullPath, subContainer, depth + 1);
              } catch (subErr) {
                console.error("Error loading subdirectory:", subErr);
                // Show error in subdirectory
                subContainer.innerHTML = `<div class="folder-item error"><i class="fas fa-exclamation-triangle"></i> Error loading folder</div>`;
                subContainer.style.display = "block";
              }
            }
          } else {
            subContainer.style.display = "none";
            item.innerHTML = `<i class="fas fa-folder"></i> ${entry.name}`;
          }
        });

        container.appendChild(item);
        container.appendChild(subContainer);
      } else {
        // File
        item.classList.add("file");
        const isImage = /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(entry.name);
        const isText = await isTextFile(entry.name);
        item.innerHTML = `<i class="fas fa-${isImage ? "image" : "file"}"></i> ${entry.name}`;

        // Click to open file in new tab or insert image
        item.addEventListener("click", async () => {
          try {
            const fullPath = `${path}/${entry.name}`;

            if (isImage) {
              // Insert image into markdown
              const relativePath = fullPath.replace(currentFolderPath!, "");
              const imageMarkdown = `![${entry.name}](${relativePath})`;
              if (markdownInput) {
                const cursorPos = markdownInput.selectionStart;
                const currentValue = markdownInput.value;
                const newValue =
                  currentValue.slice(0, cursorPos) +
                  imageMarkdown +
                  currentValue.slice(cursorPos);
                markdownInput.value = newValue;
                markdownInput.focus();
                markdownInput.setSelectionRange(
                  cursorPos + imageMarkdown.length,
                  cursorPos + imageMarkdown.length,
                );

                // Update preview
                const parseResult = marked.parse(newValue);
                if (typeof parseResult === "string") {
                  if (markdownPreview) markdownPreview.innerHTML = parseResult;
                } else {
                  parseResult.then((html) => {
                    if (markdownPreview) markdownPreview.innerHTML = html;
                  });
                }
                renderMathFormulas();
                updateWordAndCharacterCount();
              }
            } else if (isText) {
              // Check if file is already open
              if (isFileAlreadyOpen(fullPath)) {
                // Switch to existing tab
                const existingTabIndex = allTabs.findIndex(
                  (tab) => tab.path === fullPath,
                );
                if (existingTabIndex !== -1) {
                  switchToTab(existingTabIndex);
                }
              } else {
                // Open text file in new tab
                const content = await readTextFile(fullPath);
                createNewTab(fullPath, content, entry.name, true);
              }
            } else {
              // Binary file - show message
              if (statusMsg)
                statusMsg.textContent = `Cannot open binary file: ${entry.name}`;
            }
          } catch (err) {
            console.error("Error reading file:", err);
            // Provide more specific error messages
            if (err instanceof Error) {
              const errorMessage = err.message.toLowerCase();
              if (errorMessage.includes("permission") || errorMessage.includes("access")) {
                if (statusMsg) statusMsg.textContent = `Permission denied: ${entry.name}`;
              } else if (errorMessage.includes("not found") || errorMessage.includes("no such file")) {
                if (statusMsg) statusMsg.textContent = `File not found: ${entry.name}`;
              } else if (errorMessage.includes("is a directory")) {
                if (statusMsg) statusMsg.textContent = `Cannot open directory as file: ${entry.name}`;
              } else {
                if (statusMsg) statusMsg.textContent = `Error reading file: ${entry.name} (${err.message})`;
              }
            } else {
              if (statusMsg) statusMsg.textContent = `Error reading file: ${entry.name}`;
            }
          }
        });

        container.appendChild(item);
      }
    }
  } catch (err) {
    console.error("Error reading directory:", err);

    // Create error item to show in the tree
    const errorItem = document.createElement("div");
    errorItem.className = "folder-item error";
    errorItem.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error reading directory`;

    // Provide more specific error messages
    if (err instanceof Error) {
      const errorMessage = err.message.toLowerCase();
      if (errorMessage.includes("permission") || errorMessage.includes("access")) {
        errorItem.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Permission denied`;
        if (statusMsg) statusMsg.textContent = "Permission denied: Cannot access this directory";
      } else if (errorMessage.includes("not found") || errorMessage.includes("no such file")) {
        errorItem.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Directory not found`;
        if (statusMsg) statusMsg.textContent = "Directory not found";
      } else if (errorMessage.includes("network") || errorMessage.includes("connection")) {
        errorItem.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Network error`;
        if (statusMsg) statusMsg.textContent = "Network error: Cannot access directory";
      } else {
        if (statusMsg) statusMsg.textContent = `Error reading directory: ${err.message}`;
      }
    } else {
      if (statusMsg) statusMsg.textContent = "Error reading directory";
    }

    container.appendChild(errorItem);
  }
}

// Function to create a new file
async function createNewFile(): Promise<void> {
  const targetPath = selectedFolderPath || currentFolderPath;
  if (!targetPath) {
    if (statusMsg) statusMsg.textContent = "Please open a folder first";
    return;
  }

  try {
    const fileName = await customPrompt("Create New File", "Enter file name (with extension)");
    if (!fileName || !fileName.trim()) return;

    const trimmedFileName = fileName.trim();
    const filePath = `${targetPath}/${trimmedFileName}`;

    // Check if file already exists
    const fileExists = await exists(filePath);
    if (fileExists) {
      if (statusMsg) statusMsg.textContent = `File "${trimmedFileName}" already exists`;
      return;
    }

    // Create empty file using Tauri FS
    await writeTextFile(filePath, "");

    // Refresh folder tree from root folder to ensure full update
    if (folderTreeContainer && currentFolderPath) {
      const previousSelected = selectedFolderPath;
      await createFolderTree(currentFolderPath, folderTreeContainer, 0);
      // Restore selection if possible
      if (previousSelected) {
        selectedFolderPath = previousSelected;
        // Optionally, re-select the folder item in the tree
        const selectedElements = folderTreeContainer.querySelectorAll(".folder-item.selected");
        selectedElements.forEach(el => el.classList.remove("selected"));
        const newSelected = Array.from(folderTreeContainer.querySelectorAll(".folder-item")).find(el => {
          return el.textContent?.includes(previousSelected.split("/").pop() || "") && el.classList.contains("folder");
        });
        if (newSelected) {
          newSelected.classList.add("selected");
        }
      }
    }

    if (statusMsg) statusMsg.textContent = `Created file: ${trimmedFileName}`;
  } catch (error) {
    console.error("Error creating file:", error);

    // Check for specific error types with more precise matching
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      // Check for actual permission errors first
      if (errorMessage.includes("permission denied") || errorMessage.includes("access denied")) {
        if (statusMsg) statusMsg.textContent = "Permission denied: Cannot create file in this location";
      }
      // Check for path not found errors
      else if (errorMessage.includes("no such file") || errorMessage.includes("path not found")) {
        if (statusMsg) statusMsg.textContent = "Path not found: Please check the folder path";
      }
      // Check for file already exists
      else if (errorMessage.includes("already exists") || errorMessage.includes("file exists")) {
        if (statusMsg) statusMsg.textContent = "File already exists";
      }
      // Handle Tauri-specific "forbidden path" errors differently
      else if (errorMessage.includes("forbidden path")) {
        if (statusMsg) statusMsg.textContent = "Invalid path: File name contains invalid characters or format";
      }
      // Handle other forbidden/restricted errors
      else if (errorMessage.includes("forbidden") || errorMessage.includes("restricted")) {
        if (statusMsg) statusMsg.textContent = "Access forbidden: This path is restricted";
      }
      // Generic error with more details
      else {
        if (statusMsg) statusMsg.textContent = `Error creating file: ${error.message}`;
      }
    } else {
      if (statusMsg) statusMsg.textContent = "Error creating file";
    }
  }
}

// Function to create a new folder
async function createNewFolder(): Promise<void> {
  const targetPath = selectedFolderPath || currentFolderPath;
  if (!targetPath) {
    if (statusMsg) statusMsg.textContent = "Please open a folder first";
    return;
  }

  try {
    const folderName = await customPrompt("Create New Folder", "Enter folder name");
    if (!folderName || !folderName.trim()) return;

    const folderPath = `${targetPath}/${folderName.trim()}`;

    // Check if folder already exists
    const folderExists = await exists(folderPath);
    if (folderExists) {
      if (statusMsg) statusMsg.textContent = `Folder "${folderName}" already exists`;
      return;
    }

    // Create folder using Tauri FS
    await mkdir(folderPath, { recursive: true });

    // Refresh folder tree from root folder to ensure full update
    if (folderTreeContainer && currentFolderPath) {
      const previousSelected = selectedFolderPath;
      await createFolderTree(currentFolderPath, folderTreeContainer, 0);
      // Restore selection if possible
      if (previousSelected) {
        selectedFolderPath = previousSelected;
        // Optionally, re-select the folder item in the tree
        const selectedElements = folderTreeContainer.querySelectorAll(".folder-item.selected");
        selectedElements.forEach(el => el.classList.remove("selected"));
        const newSelected = Array.from(folderTreeContainer.querySelectorAll(".folder-item")).find(el => {
          return el.textContent?.includes(previousSelected.split("/").pop() || "") && el.classList.contains("folder");
        });
        if (newSelected) {
          newSelected.classList.add("selected");
        }
      }
    }

    if (statusMsg) statusMsg.textContent = `Created folder: ${folderName}`;
  } catch (error) {
    console.error("Error creating folder:", error);

    // Check for specific error types with more precise matching
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      // Check for actual permission errors first
      if (errorMessage.includes("permission denied") || errorMessage.includes("access denied")) {
        if (statusMsg) statusMsg.textContent = "Permission denied: Cannot create folder in this location";
      }
      // Check for path not found errors
      else if (errorMessage.includes("no such file") || errorMessage.includes("path not found")) {
        if (statusMsg) statusMsg.textContent = "Path not found: Please check the folder path";
      }
      // Check for folder already exists
      else if (errorMessage.includes("already exists") || errorMessage.includes("file exists")) {
        if (statusMsg) statusMsg.textContent = "Folder already exists";
      }
      // Handle Tauri-specific "forbidden path" errors differently
      else if (errorMessage.includes("forbidden path")) {
        if (statusMsg) statusMsg.textContent = "Invalid path: Folder name contains invalid characters or format";
      }
      // Handle other forbidden/restricted errors
      else if (errorMessage.includes("forbidden") || errorMessage.includes("restricted")) {
        if (statusMsg) statusMsg.textContent = "Access forbidden: This path is restricted";
      }
      // Generic error with more details
      else {
        if (statusMsg) statusMsg.textContent = `Error creating folder: ${error.message}`;
      }
    } else {
      if (statusMsg) statusMsg.textContent = "Error creating folder";
    }
  }
}

// New file button event listener
if (newFileButton) {
  newFileButton.addEventListener("click", createNewFile);
}

// New folder button event listener
if (newFolderButton) {
  newFolderButton.addEventListener("click", createNewFolder);
}

// Open folder dialog and load folder tree
if (openFolderButton) {
  openFolderButton.addEventListener("click", async () => {
    try {
      const selectedFolder = await openFolderDialog({
        directory: true,
        multiple: false,
        recursive: false,
      });

      if (selectedFolder && typeof selectedFolder === "string") {
        currentFolderPath = selectedFolder;
        if (folderTreeContainer) {
          await createFolderTree(currentFolderPath, folderTreeContainer, 0);
          if (statusMsg)
            statusMsg.textContent = `Opened folder: ${currentFolderPath}`;
        }
        toggleBigOpenFolderButton();
      }
    } catch (err) {
      console.error("Error opening folder:", err);
      if (statusMsg) statusMsg.textContent = `Error opening folder`;
    }
  });
}

// Big open folder button click handler
if (openFolderBigButton) {
  openFolderBigButton.addEventListener("click", async () => {
    try {
      const selectedFolder = await openFolderDialog({
        directory: true,
        multiple: false,
        recursive: false,
      });

      if (selectedFolder && typeof selectedFolder === "string") {
        currentFolderPath = selectedFolder;
        if (folderTreeContainer) {
          await createFolderTree(currentFolderPath, folderTreeContainer, 0);
          if (statusMsg)
            statusMsg.textContent = `Opened folder: ${currentFolderPath}`;
        }
        toggleBigOpenFolderButton();
      }
    } catch (err) {
      console.error("Error opening folder:", err);
      if (statusMsg) statusMsg.textContent = `Error opening folder`;
    }
  });
}

// Selection toolbar and modal elements
const selectionToolbar = document.getElementById(
  "selection-toolbar",
) as HTMLDivElement;
const selectionEditButton = document.getElementById(
  "selection-edit-ai",
) as HTMLButtonElement;
const selectionModal = document.getElementById(
  "selection-ai-modal",
) as HTMLDivElement;
const selectedTextPreview = document.getElementById(
  "selected-text-preview",
) as HTMLParagraphElement;
const selectionPromptInput = document.getElementById(
  "selection-ai-prompt",
) as HTMLInputElement;
const selectionResponseTextarea = document.getElementById(
  "selection-ai-response",
) as HTMLTextAreaElement;
const acceptSelectionButton = document.getElementById(
  "accept-selection",
) as HTMLButtonElement;
const rejectSelectionButton = document.getElementById(
  "reject-selection",
) as HTMLButtonElement;
const closeSelectionModal = document.getElementById(
  "close-selection-modal",
) as HTMLSpanElement;

// Validate essential UI elements exist
if (!markdownInput || !markdownPreview) {
  console.error("Required editor or preview elements not found");
}

// Tab structure
interface Tab {
  id: string;
  title: string;
  path: string | null;
  content: string;
  hasUnsavedChanges: boolean;
  history: string[];
  historyIndex: number;
}

// Tab management state
const allTabs: Tab[] = [];
let activeTabIndex = -1;
let untitledFileCounter = 1;

// Generate unique ID for tabs
function createUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Update tabs display
function refreshTabsDisplay(): void {
  if (!tabsContainer) return;

  tabsContainer.innerHTML = "";

  allTabs.forEach((tab, index) => {
    const tabElement = document.createElement("div");
    const isActiveTab = index === activeTabIndex;

    tabElement.className = "tab" + (isActiveTab ? " active" : "");
    tabElement.dataset.index = String(index);

    tabElement.innerHTML = `
      <span class="tab-title">${tab.title}</span>
      ${tab.hasUnsavedChanges ? '<span class="unsaved">*</span>' : ""}
      <span class="close" title="Close tab">&times;</span>
    `;

    // Handle tab click (switch to tab)
    tabElement.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains("close")) {
        switchToTab(index);
      }
    });

    // Handle close button click
    const closeButton = tabElement.querySelector(".close") as HTMLElement;
    closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      closeTab(index);
    });

    tabsContainer.appendChild(tabElement);
  });
}

// Create new tab
function createNewTab(
  filePath: string | null = null,
  content = "",
  title?: string,
  makeActive = true,
): Tab {
  const newId = createUniqueId();

  let displayTitle: string;
  if (title) {
    displayTitle = title;
  } else if (filePath) {
    displayTitle = filePath.split("/").pop() || filePath;
  } else {
    displayTitle = `Untitled ${untitledFileCounter++}`;
  }

  const newTab: Tab = {
    id: newId,
    title: displayTitle,
    path: filePath,
    content: content,
    hasUnsavedChanges: false,
    history: [content],
    historyIndex: 0,
  };

  allTabs.push(newTab);

  if (makeActive) {
    activeTabIndex = allTabs.length - 1;
    showTabContent(newTab);
  }

  refreshTabsDisplay();
  return newTab;
}

// Show content of a specific tab
async function showTabContent(tab: Tab) {
  if (!markdownInput || !markdownPreview) return;

  markdownInput.value = tab.content;

  const parseResult = marked.parse(tab.content || "");
  if (typeof parseResult === "string") {
    markdownPreview.innerHTML = parseResult;
  } else {
    markdownPreview.innerHTML = await parseResult;
  }
  renderMathFormulas();
  updateWordAndCharacterCount();
  updateUndoRedoButtons();

  if (statusMsg) {
    statusMsg.textContent = tab.path ? tab.path : "Unsaved file";
  }
}

// Switch to specific tab
function switchToTab(index: number): void {
  if (index < 0 || index >= allTabs.length) return;

  activeTabIndex = index;
  showTabContent(allTabs[index]);
  refreshTabsDisplay();
}

// Close a tab
async function closeTab(index: number): Promise<void> {
  if (index < 0 || index >= allTabs.length) return;

  const tab = allTabs[index];

  // Ask user if they want to close unsaved tab
  if (tab.hasUnsavedChanges) {
    const userConfirmed = confirm(
      `Tab "${tab.title}" has unsaved changes. Close anyway?`,
    );
    if (!userConfirmed) return;
  }

  allTabs.splice(index, 1);

  // If no tabs left, create a new empty one
  if (allTabs.length === 0) {
    createNewTab(null, "");
  } else {
    // Adjust active tab index if needed
    if (activeTabIndex >= allTabs.length) {
      activeTabIndex = allTabs.length - 1;
    }
    showTabContent(allTabs[activeTabIndex]);
  }

  refreshTabsDisplay();
}

// Debounce function to delay history updates
function debounce(func: Function, delay: number): Function {
  let timeoutId: NodeJS.Timeout;
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Debounced version of addToHistory
const debouncedAddToHistory = debounce(addToHistory, 500);

// Handle text input changes
if (markdownInput) {
  markdownInput.addEventListener("input", async () => {
    const currentIndex = activeTabIndex;

    if (currentIndex >= 0 && allTabs[currentIndex]) {
      allTabs[currentIndex].content = markdownInput.value;
      allTabs[currentIndex].hasUnsavedChanges = true;
      refreshTabsDisplay();

      // Add to history for undo/redo with debounce
      debouncedAddToHistory(markdownInput.value);
    }

    // Update live preview
    const parseResult = marked.parse(markdownInput.value);
    if (typeof parseResult === "string") {
      markdownPreview.innerHTML = parseResult;
    } else {
      markdownPreview.innerHTML = await parseResult;
    }
    renderMathFormulas();
    updateWordAndCharacterCount();
  });

  // Sync scrolling between input and preview
  markdownInput.addEventListener("scroll", () => {
    const inputScrollRatio =
      markdownInput.scrollTop /
      (markdownInput.scrollHeight - markdownInput.clientHeight || 1);
    markdownPreview.scrollTop =
      inputScrollRatio *
      (markdownPreview.scrollHeight - markdownPreview.clientHeight || 1);
  });
}

// Start with one empty tab
createNewTab(null, "");

// Undo/Redo functionality
const MAX_HISTORY_LENGTH = 100;

function addToHistory(content: string): void {
  if (activeTabIndex < 0) return;

  const currentTab = allTabs[activeTabIndex];

  // Remove future history if we're not at the end
  if (currentTab.historyIndex < currentTab.history.length - 1) {
    currentTab.history = currentTab.history.slice(
      0,
      currentTab.historyIndex + 1,
    );
  }

  // Add new state to history
  currentTab.history.push(content);

  // Limit history size
  if (currentTab.history.length > MAX_HISTORY_LENGTH) {
    currentTab.history.shift();
  } else {
    currentTab.historyIndex = currentTab.history.length - 1;
  }

  updateUndoRedoButtons();
}

function undo(): void {
  if (activeTabIndex < 0) return;

  const currentTab = allTabs[activeTabIndex];

  if (currentTab.historyIndex > 0) {
    currentTab.historyIndex--;
    const previousContent = currentTab.history[currentTab.historyIndex];

    if (markdownInput) {
      markdownInput.value = previousContent;
      currentTab.content = previousContent;
      currentTab.hasUnsavedChanges = true;

      // Update preview
      const parseResult = marked.parse(previousContent);
      if (typeof parseResult === "string") {
        if (markdownPreview) {
          markdownPreview.innerHTML = parseResult;
          renderMathFormulas();
        }
      } else {
        parseResult.then((html) => {
          if (markdownPreview) {
            markdownPreview.innerHTML = html;
            renderMathFormulas();
          }
        });
      }

      updateWordAndCharacterCount();
      updateUndoRedoButtons();
    }
  }
}

function redo(): void {
  if (activeTabIndex < 0) return;

  const currentTab = allTabs[activeTabIndex];

  if (currentTab.historyIndex < currentTab.history.length - 1) {
    currentTab.historyIndex++;
    const nextContent = currentTab.history[currentTab.historyIndex];

    if (markdownInput) {
      markdownInput.value = nextContent;
      currentTab.content = nextContent;
      currentTab.hasUnsavedChanges = true;

      // Update preview
      const parseResult = marked.parse(nextContent);
      if (typeof parseResult === "string") {
        if (markdownPreview) {
          markdownPreview.innerHTML = parseResult;
          renderMathFormulas();
        }
      } else {
        parseResult.then((html) => {
          if (markdownPreview) {
            markdownPreview.innerHTML = html;
            renderMathFormulas();
          }
        });
      }

      updateWordAndCharacterCount();
      updateUndoRedoButtons();
    }
  }
}

function updateUndoRedoButtons(): void {
  const undoButton = document.getElementById("menu-undo") as HTMLElement;
  const redoButton = document.getElementById("menu-redo") as HTMLElement;

  if (activeTabIndex >= 0) {
    const currentTab = allTabs[activeTabIndex];

    // Update undo button
    if (currentTab.historyIndex > 0) {
      undoButton.removeAttribute("disabled");
      undoButton.style.opacity = "1";
      undoButton.style.cursor = "pointer";
    } else {
      undoButton.setAttribute("disabled", "true");
      undoButton.style.opacity = "0.5";
      undoButton.style.cursor = "default";
    }

    // Update redo button
    if (currentTab.historyIndex < currentTab.history.length - 1) {
      redoButton.removeAttribute("disabled");
      redoButton.style.opacity = "1";
      redoButton.style.cursor = "pointer";
    } else {
      redoButton.setAttribute("disabled", "true");
      redoButton.style.opacity = "0.5";
      redoButton.style.cursor = "default";
    }
  } else {
    undoButton.setAttribute("disabled", "true");
    redoButton.setAttribute("disabled", "true");
    undoButton.style.opacity = "0.5";
    redoButton.style.opacity = "0.5";
    undoButton.style.cursor = "default";
    redoButton.style.cursor = "default";
  }
}

// Update character and word count display
function updateWordAndCharacterCount(): void {
  const charCountElement = document.getElementById("char-count");
  const wordCountElement = document.getElementById("word-count");

  if (!charCountElement || !wordCountElement || !markdownInput) return;

  const text = markdownInput.value;
  const characterCount = text.length;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  charCountElement.textContent = `${characterCount} characters`;
  wordCountElement.textContent = `${wordCount} words`;
}

// File operations
export async function saveFile(): Promise<void> {
  try {
    if (activeTabIndex < 0) return;

    const currentTab = allTabs[activeTabIndex];

    // If file doesn't have a path, ask user where to save
    if (!currentTab.path) {
      const selectedPath = await save({
        filters: [{ name: "Markdown", extensions: ["md"] }],
      });

      if (!selectedPath) return;

      currentTab.path = selectedPath as string;
      currentTab.title = currentTab.path.split("/").pop() || currentTab.title;
    }

    await writeTextFile(currentTab.path, markdownInput.value);
    currentTab.content = markdownInput.value;
    currentTab.hasUnsavedChanges = false;

    refreshTabsDisplay();

    if (statusMsg) {
      statusMsg.textContent = `Saved ${currentTab.path}`;
    }
  } catch (error) {
    console.error("Error saving file:", error);
    if (statusMsg) {
      statusMsg.textContent = `Error saving file`;
    }
  }
}

export async function saveFileAs(): Promise<void> {
  try {
    if (activeTabIndex < 0) return;

    const currentTab = allTabs[activeTabIndex];

    const selectedPath = await save({
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });

    if (!selectedPath) return;

    currentTab.path = selectedPath as string;
    currentTab.title = currentTab.path.split("/").pop() || currentTab.title;

    await writeTextFile(currentTab.path, markdownInput.value);
    currentTab.content = markdownInput.value;
    currentTab.hasUnsavedChanges = false;

    refreshTabsDisplay();

    if (statusMsg) {
      statusMsg.textContent = `Saved as ${currentTab.path}`;
    }
  } catch (error) {
    console.error("Error saving file as:", error);
    if (statusMsg) {
      statusMsg.textContent = `Error saving file as`;
    }
  }
}

export async function openFile(): Promise<void> {
  try {
    const selectedFiles = await open({
      multiple: true,
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });

    if (!selectedFiles) return;

    const filePaths = Array.isArray(selectedFiles)
      ? selectedFiles
      : [selectedFiles];

    for (const filePath of filePaths) {
      const fileContent = await readTextFile(filePath);
      const fileName = filePath.split("/").pop() || filePath;
      createNewTab(filePath, fileContent, fileName, true);
    }

    if (statusMsg) {
      statusMsg.textContent = `Opened ${filePaths.length} file(s)`;
    }
  } catch (error) {
    console.error("Error opening file:", error);
    if (statusMsg) {
      statusMsg.textContent = `Error opening file`;
    }
  }
}

export function newFile(): void {
  createNewTab(null, "");
  if (statusMsg) {
    statusMsg.textContent = `New tab created`;
  }
}

export async function exportHtml(): Promise<void> {
  try {
    if (activeTabIndex < 0) return;

    const selectedPath = await save({
      filters: [{ name: "HTML", extensions: ["html"] }],
    });

    if (!selectedPath) return;

    const htmlContent = `<!doctype html><html><body>${await marked.parse(markdownInput.value)}</body></html>`;
    await writeTextFile(selectedPath, htmlContent);

    if (statusMsg) {
      statusMsg.textContent = `Exported as HTML: ${selectedPath}`;
    }
  } catch (error) {
    console.error("Error exporting HTML:", error);
    if (statusMsg) {
      statusMsg.textContent = `Error exporting HTML`;
    }
  }
}

export async function exportPdf(): Promise<void> {
  try {
    if (activeTabIndex < 0) return;

    const selectedPath = await save({
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });

    if (!selectedPath) return;

    const htmlContent = await marked.parse(markdownInput.value);
    const doc = new jsPDF();

    // Create a temporary element to hold the HTML content
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.fontSize = "12px";
    tempDiv.style.lineHeight = "1.5";
    tempDiv.style.padding = "20px";

    // Use jsPDF's html method to add the content
    await doc.html(tempDiv, {
      callback: async function (doc) {
        const pdfBlob = doc.output("blob");
        const arrayBuffer = await pdfBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        await writeFile(selectedPath, uint8Array);
      },
      x: 10,
      y: 10,
      width: 190,
      windowWidth: 650,
    });

    if (statusMsg) {
      statusMsg.textContent = `Exported as PDF: ${selectedPath}`;
    }
  } catch (error) {
    console.error("Error exporting PDF:", error);
    if (statusMsg) {
      statusMsg.textContent = `Error exporting PDF`;
    }
  }
}

export async function exitApp(): Promise<void> {
  const hasUnsavedTabs = allTabs.some((tab) => tab.hasUnsavedChanges);

  if (hasUnsavedTabs) {
    const userConfirmed = confirm("There are unsaved tabs. Exit anyway?");
    if (!userConfirmed) return;
  }

  await exit(0);
}

// Theme switching
const themeToggleButton = document.getElementById(
  "toggle-theme",
) as HTMLButtonElement;
const sunIcon = themeToggleButton?.querySelector(".fa-sun") as HTMLElement;
const moonIcon = themeToggleButton?.querySelector(".fa-moon") as HTMLElement;

function updateThemeIcon(): void {
  const isDarkMode = document.body.classList.contains("dark");

  if (isDarkMode) {
    sunIcon.style.display = "inline";
    moonIcon.style.display = "none";
  } else {
    sunIcon.style.display = "none";
    moonIcon.style.display = "inline";
  }
}

if (themeToggleButton) {
  themeToggleButton.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    document.body.classList.toggle("light");

    const newTheme = document.body.classList.contains("dark")
      ? "dark"
      : "light";
    localStorage.setItem("theme", newTheme);

    updateThemeIcon();
  });

  // Load saved theme
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.add("light");
  }

  updateThemeIcon();
}

// Math formula rendering
function renderMathFormulas(): void {
  if (markdownPreview) {
    renderMathInElement(markdownPreview, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false },
        { left: "\\[", right: "\\]", display: true },
      ],
      throwOnError: false,
      ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"],
      ignoredClasses: ["no-math"],
    });
  }
}

// AI Model selection
let selectedAiModel = "qwen3:0.6b";
const modelSelectDropdown = document.getElementById(
  "ollama-model-select",
) as HTMLSelectElement;

async function loadAvailableModels(): Promise<void> {
  try {
    const response = await fetch("http://127.0.0.1:11434/api/tags");
    const data = await response.json();

    if (Array.isArray(data.models) && modelSelectDropdown) {
      modelSelectDropdown.innerHTML = "";

      data.models.forEach((model: any) => {
        const option = document.createElement("option");
        option.value = model.name;
        option.textContent = model.name;
        modelSelectDropdown.appendChild(option);
      });

      selectedAiModel = modelSelectDropdown.value;
    }
  } catch (error) {
    if (modelSelectDropdown) {
      modelSelectDropdown.innerHTML = `<option>Error loading models</option>`;
    }
  }
}

if (modelSelectDropdown) {
  loadAvailableModels();

  modelSelectDropdown.addEventListener("change", () => {
    selectedAiModel = modelSelectDropdown.value;
  });
}

// AI Chat streaming functionality
async function streamAiResponse(
  userPrompt: string,
  chatHistoryContainer: HTMLDivElement,
): Promise<void> {
  const response = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: selectedAiModel,
      prompt: userPrompt,
      stream: true,
    }),
  });

  if (!response.ok || !response.body) {
    throw new Error(
      `AI API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // Create AI message container
  const aiMessageDiv = document.createElement("div");
  aiMessageDiv.className = "msg ai";

  // Create thinking section (expandable)
  const thinkingDetails = document.createElement("details");
  const thinkingSummary = document.createElement("summary");
  thinkingSummary.textContent = "🤔 Model Thinking";

  const thinkingContent = document.createElement("pre");
  thinkingContent.className = "think-content";
  thinkingContent.style.whiteSpace = "pre-wrap";
  thinkingContent.style.margin = "0";

  thinkingDetails.appendChild(thinkingSummary);
  thinkingDetails.appendChild(thinkingContent);

  // Create response content section
  const responseContent = document.createElement("div");
  responseContent.className = "ai-response";
  responseContent.innerHTML = `<i class="fas fa-robot"></i> `;

  // Create copy button
  const copyButton = document.createElement("button");
  copyButton.className = "copy-ai-response";
  copyButton.innerHTML = `<i class="fas fa-copy"></i> Copy Response`;
  copyButton.style.margin = "0.5em 0 0.5em 0";
  copyButton.style.display = "block";
  copyButton.style.background = "var(--accent)";
  copyButton.style.color = "#fff";
  copyButton.style.border = "none";
  copyButton.style.borderRadius = "4px";
  copyButton.style.padding = "0.3em 1em";
  copyButton.style.cursor = "pointer";
  copyButton.style.fontSize = "0.95em";

  let visibleMarkdownContent = "";

  copyButton.onclick = async () => {
    try {
      await navigator.clipboard.writeText(visibleMarkdownContent);
      copyButton.textContent = "Copied!";
      setTimeout(() => {
        copyButton.innerHTML = `<i class="fas fa-copy"></i> Copy Response`;
      }, 1200);
    } catch {
      copyButton.textContent = "Failed to copy";
    }
  };

  aiMessageDiv.appendChild(thinkingDetails);
  aiMessageDiv.appendChild(responseContent);
  aiMessageDiv.appendChild(copyButton);
  chatHistoryContainer.appendChild(aiMessageDiv);

  // Streaming variables
  let fullStreamText = "";
  let isInsideThinkTags = false;
  let thinkingText = "";

  const updateDisplay = () => {
    responseContent.innerHTML = `
      <i class="fas fa-robot"></i>
      <div class="ai-text">
        ${marked.parse(visibleMarkdownContent)}
      </div>
    `;
    thinkingContent.textContent = thinkingText;

    renderMathInElement(responseContent);
    renderMathInElement(thinkingContent);

    chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
  };

  const processStreamText = (newText: string) => {
    fullStreamText += newText;

    while (true) {
      const thinkOpenIndex = fullStreamText.indexOf("<think>");
      const thinkCloseIndex = fullStreamText.indexOf("</think>");

      if (thinkOpenIndex === -1 && thinkCloseIndex === -1) {
        if (isInsideThinkTags) {
          thinkingText += fullStreamText;
        } else {
          visibleMarkdownContent += fullStreamText;
        }
        fullStreamText = "";
        break;
      }

      let nextTagIndex = -1;
      let isOpeningTag = false;

      if (thinkOpenIndex !== -1 && thinkCloseIndex !== -1) {
        isOpeningTag = thinkOpenIndex < thinkCloseIndex;
        nextTagIndex = Math.min(thinkOpenIndex, thinkCloseIndex);
      } else if (thinkOpenIndex !== -1) {
        isOpeningTag = true;
        nextTagIndex = thinkOpenIndex;
      } else {
        isOpeningTag = false;
        nextTagIndex = thinkCloseIndex;
      }

      const textBeforeTag = fullStreamText.slice(0, nextTagIndex);

      if (textBeforeTag) {
        if (isInsideThinkTags) {
          thinkingText += textBeforeTag;
        } else {
          visibleMarkdownContent += textBeforeTag;
        }
      }

      if (isOpeningTag) {
        fullStreamText = fullStreamText.slice(nextTagIndex + "<think>".length);
        isInsideThinkTags = true;
      } else {
        fullStreamText = fullStreamText.slice(nextTagIndex + "</think>".length);
        isInsideThinkTags = false;
      }
    }

    updateDisplay();
  };

  updateDisplay();

  // Process streaming response
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const jsonData = JSON.parse(line);
        if (typeof jsonData.response === "string") {
          processStreamText(jsonData.response);
        }
      } catch (error) {
        // Ignore parsing errors
      }
    }
  }

  // Process any remaining buffer
  if (buffer.trim()) {
    try {
      const jsonData = JSON.parse(buffer);
      if (typeof jsonData.response === "string") {
        processStreamText(jsonData.response);
      }
    } catch {
      processStreamText(buffer);
    }
  }

  updateDisplay();
}

// Chat interface setup
const sendChatButton = document.getElementById(
  "send-chat",
) as HTMLButtonElement;
const chatInputBox = document.getElementById("chat-box") as HTMLInputElement;
const chatHistoryDiv = document.getElementById(
  "chat-history",
) as HTMLDivElement;

if (sendChatButton && chatInputBox && chatHistoryDiv) {
  // Handle Enter key (Shift+Enter for newline, Enter to send)
  chatInputBox.addEventListener("keydown", async function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendChatButton.click();
    }
  });

  sendChatButton.onclick = async function () {
    const userMessage = chatInputBox.value.trim();
    if (!userMessage) return;

    // Add user message to chat
    chatHistoryDiv.innerHTML += `
      <div class="msg user">
        <i class="fas fa-user"></i> ${userMessage.replace(/\n/g, "<br>")}
      </div>
    `;

    chatInputBox.value = "";
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;

    try {
      await streamAiResponse(userMessage, chatHistoryDiv);
    } catch (error) {
      chatHistoryDiv.innerHTML += `
        <div class="msg ai error">
          <i class="fas fa-robot"></i> Error: ${error}
        </div>
      `;
      console.error(error);
    }

    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;
  };
}

// Removed edit markdown functionality to remove the option from the toolbar
const editMarkdownButton = document.getElementById(
  "toolbar-edit",
) as HTMLButtonElement;
if (editMarkdownButton) {
  // Hide the edit markdown button from the toolbar
  editMarkdownButton.style.display = "none";
}

// Selection toolbar and AI editing functionality
let currentSelection = { start: 0, end: 0, text: "" };

// Function to get text selection in textarea
function getTextareaSelection(): {
  start: number;
  end: number;
  text: string;
} | null {
  if (!markdownInput) return null;

  const start = markdownInput.selectionStart;
  const end = markdownInput.selectionEnd;
  const text = markdownInput.value.slice(start, end);

  if (start !== end && text.trim()) {
    return { start, end, text };
  }
  return null;
}

// Function to position the toolbar near the selection
function positionToolbar(selection: { start: number; end: number }) {
  if (!markdownInput || !selectionToolbar) return;

  const textareaRect = markdownInput.getBoundingClientRect();

  // Get the position of the selection
  const startPos = getCaretCoordinates(markdownInput, selection.start);

  // Position toolbar above the selection
  const toolbarX = textareaRect.left + startPos.left;
  const toolbarY = textareaRect.top + startPos.top - 40; // 40px above

  selectionToolbar.style.left = `${toolbarX}px`;
  selectionToolbar.style.top = `${toolbarY}px`;
  selectionToolbar.style.display = "flex";
}

// Helper function to get caret coordinates (simplified)
function getCaretCoordinates(element: HTMLTextAreaElement, position: number) {
  // Create a temporary div to measure text
  const div = document.createElement("div");
  const style = getComputedStyle(element);

  // Copy styles
  [
    "fontSize",
    "fontFamily",
    "lineHeight",
    "padding",
    "border",
    "wordWrap",
    "whiteSpace",
  ].forEach((prop) => {
    (div.style as any)[prop] = style[prop as keyof CSSStyleDeclaration];
  });

  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.width = element.offsetWidth + "px";
  div.style.height = "auto";

  // Get text before cursor
  const text = element.value.substring(0, position);
  div.textContent = text;

  document.body.appendChild(div);

  const span = document.createElement("span");
  span.textContent = element.value.substring(position) || ".";
  div.appendChild(span);

  const coordinates = {
    left: span.offsetLeft,
    top: span.offsetTop,
  };

  document.body.removeChild(div);
  return coordinates;
}

// Handle text selection
if (markdownInput) {
  markdownInput.addEventListener("mouseup", () => {
    const selection = getTextareaSelection();
    if (selection) {
      currentSelection = selection;
      positionToolbar(selection);
    } else {
      selectionToolbar.style.display = "none";
    }
  });

  markdownInput.addEventListener("keyup", (event) => {
    // Handle arrow keys, etc.
    if (event.key.includes("Arrow") || event.key === "Escape") {
      const selection = getTextareaSelection();
      if (selection) {
        currentSelection = selection;
        positionToolbar(selection);
      } else {
        selectionToolbar.style.display = "none";
      }
    }
  });

  // Hide toolbar when clicking outside
  document.addEventListener("mousedown", (event) => {
    if (
      !selectionToolbar.contains(event.target as Node) &&
      event.target !== markdownInput
    ) {
      selectionToolbar.style.display = "none";
    }
  });
}

// Handle toolbar button click
if (selectionEditButton && selectionModal && selectedTextPreview) {
  selectionEditButton.addEventListener("click", () => {
    selectedTextPreview.textContent = `Selected text: "${currentSelection.text}"`;
    selectionPromptInput.value = "";
    selectionResponseTextarea.value = "";
    selectionModal.style.display = "flex";
    selectionPromptInput.focus();
  });
}

// Selection AI modal functionality
if (
  selectionModal &&
  selectionPromptInput &&
  selectionResponseTextarea &&
  acceptSelectionButton &&
  rejectSelectionButton &&
  closeSelectionModal
) {
  let latestSelectionSuggestion = "";

  // Generate suggestion when user presses Enter
  selectionPromptInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await generateSelectionSuggestion();
    }
  });

  // Generate suggestion when input loses focus (if not empty)
  selectionPromptInput.addEventListener("blur", async () => {
    if (selectionPromptInput.value.trim() && !selectionResponseTextarea.value) {
      await generateSelectionSuggestion();
    }
  });

  async function generateSelectionSuggestion(): Promise<void> {
    const userPrompt = selectionPromptInput.value.trim() || "Improve this text";

    selectionResponseTextarea.value = "Thinking...";
    selectionPromptInput.disabled = true;
    acceptSelectionButton.disabled = true;
    rejectSelectionButton.disabled = true;

    const fullPrompt = `Please improve the following selected text based on the user's request. Return only the improved text without any explanations or additional content:\n\nSelected text: "${currentSelection.text}"\n\nUser request: ${userPrompt}`;

    try {
      const response = await fetch("http://127.0.0.1:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: selectedAiModel,
          prompt: fullPrompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `AI API request failed: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      let suggestion = data.response || "";

      // Remove thinking tags if present
      suggestion = suggestion.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

      latestSelectionSuggestion = suggestion;
      selectionResponseTextarea.value = suggestion || "No suggestion.";
    } catch (error) {
      selectionResponseTextarea.value = "Error: " + error;
      latestSelectionSuggestion = "";
    } finally {
      selectionPromptInput.disabled = false;
      acceptSelectionButton.disabled = false;
      rejectSelectionButton.disabled = false;
    }
  }

  closeSelectionModal.onclick = () => {
    selectionModal.style.display = "none";
  };

  rejectSelectionButton.onclick = () => {
    selectionModal.style.display = "none";
  };

  acceptSelectionButton.onclick = async () => {
    if (latestSelectionSuggestion && markdownInput) {
      // Replace selected text with AI suggestion
      const currentValue = markdownInput.value;
      const newValue =
        currentValue.slice(0, currentSelection.start) +
        latestSelectionSuggestion +
        currentValue.slice(currentSelection.end);

      markdownInput.value = newValue;

      // Update preview
      const parseResult = marked.parse(newValue);
      if (typeof parseResult === "string") {
        if (markdownPreview) {
          markdownPreview.innerHTML = parseResult;
          renderMathFormulas();
        }
      } else {
        parseResult.then((html) => {
          if (markdownPreview) {
            markdownPreview.innerHTML = html;
            renderMathFormulas();
          }
        });
      }

      // Add to history
      debouncedAddToHistory(newValue);
      updateWordAndCharacterCount();

      // Hide toolbar and modal
      selectionToolbar.style.display = "none";
      selectionModal.style.display = "none";
    }
  };

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    if (event.target === selectionModal) {
      selectionModal.style.display = "none";
    }
  });
}

// Markdown formatting helper function
function wrapSelectedText(
  beforeText: string,
  afterText: string,
  placeholderText = "",
): void {
  if (!markdownInput) return;

  const startPosition = markdownInput.selectionStart;
  const endPosition = markdownInput.selectionEnd;
  const currentValue = markdownInput.value;
  const selectedText =
    currentValue.slice(startPosition, endPosition) || placeholderText;

  const newValue =
    currentValue.slice(0, startPosition) +
    beforeText +
    selectedText +
    afterText +
    currentValue.slice(endPosition);

  markdownInput.value = newValue;
  markdownInput.focus();

  // Set cursor position inside the new markup
  markdownInput.setSelectionRange(
    startPosition + beforeText.length,
    startPosition + beforeText.length + selectedText.length,
  );

  markdownInput.dispatchEvent(new Event("input"));
}

// Formatting toolbar buttons
const boldButton = document.getElementById("toolbar-bold");
if (boldButton) {
  boldButton.addEventListener("click", () =>
    wrapSelectedText("**", "**", "bold text"),
  );
}

const italicButton = document.getElementById("toolbar-italic");
if (italicButton) {
  italicButton.addEventListener("click", () =>
    wrapSelectedText("_", "_", "italic text"),
  );
}

const headingButton = document.getElementById("toolbar-heading");
if (headingButton) {
  headingButton.addEventListener("click", () => {
    if (!markdownInput) return;

    const cursorPosition = markdownInput.selectionStart;
    const currentValue = markdownInput.value;
    const lineStartPosition =
      currentValue.lastIndexOf("\n", cursorPosition - 1) + 1;
    const newValue =
      currentValue.slice(0, lineStartPosition) +
      "# " +
      currentValue.slice(lineStartPosition);

    markdownInput.value = newValue;
    markdownInput.focus();
    markdownInput.setSelectionRange(cursorPosition + 2, cursorPosition + 2);
    markdownInput.dispatchEvent(new Event("input"));
  });
}

const listButton = document.getElementById("toolbar-list");
if (listButton) {
  listButton.addEventListener("click", () => {
    if (!markdownInput) return;

    const cursorPosition = markdownInput.selectionStart;
    const currentValue = markdownInput.value;
    const lineStartPosition =
      currentValue.lastIndexOf("\n", cursorPosition - 1) + 1;
    const newValue =
      currentValue.slice(0, lineStartPosition) +
      "- " +
      currentValue.slice(lineStartPosition);

    markdownInput.value = newValue;
    markdownInput.focus();
    markdownInput.setSelectionRange(cursorPosition + 2, cursorPosition + 2);
    markdownInput.dispatchEvent(new Event("input"));
  });
}

const codeButton = document.getElementById("toolbar-code");
if (codeButton) {
  codeButton.addEventListener("click", () =>
    wrapSelectedText("`", "`", "code"),
  );
}

const quoteButton = document.getElementById("toolbar-quote");
if (quoteButton) {
  quoteButton.addEventListener("click", () => {
    if (!markdownInput) return;

    const cursorPosition = markdownInput.selectionStart;
    const currentValue = markdownInput.value;
    const lineStartPosition =
      currentValue.lastIndexOf("\n", cursorPosition - 1) + 1;
    const newValue =
      currentValue.slice(0, lineStartPosition) +
      "> " +
      currentValue.slice(lineStartPosition);

    markdownInput.value = newValue;
    markdownInput.focus();
    markdownInput.setSelectionRange(cursorPosition + 2, cursorPosition + 2);
    markdownInput.dispatchEvent(new Event("input"));
  });
}

const linkButton = document.getElementById("toolbar-link");
if (linkButton) {
  linkButton.addEventListener("click", () =>
    wrapSelectedText("[", "](https://)", "link text"),
  );
}

const imageButton = document.getElementById("toolbar-image");
if (imageButton) {
  imageButton.addEventListener("click", () =>
    wrapSelectedText("![", "](https://)", "alt text"),
  );
}

// Menu event handlers
function setupMenuHandlers(): void {
  document.getElementById("menu-new")?.addEventListener("click", newFile);
  document.getElementById("menu-open")?.addEventListener("click", openFile);
  document.getElementById("menu-save")?.addEventListener("click", saveFile);
  document
    .getElementById("menu-save-as")
    ?.addEventListener("click", saveFileAs);
  document
    .getElementById("menu-export-html")
    ?.addEventListener("click", exportHtml);
  document
    .getElementById("menu-export-pdf")
    ?.addEventListener("click", exportPdf);
  document.getElementById("menu-exit")?.addEventListener("click", exitApp);

  // Edit menu handlers
  document.getElementById("menu-undo")?.addEventListener("click", undo);
  document.getElementById("menu-redo")?.addEventListener("click", redo);
}

// Add tab button handler
function setupAddTabButton(): void {
  const addTabButton = document.getElementById("add-tab");
  if (addTabButton) {
    addTabButton.addEventListener("click", newFile);
  }
}

// Panel resizing functionality
function setupPanelResizing(): void {
  const container = document.querySelector(".container") as HTMLElement;
  const resizers = document.querySelectorAll(
    ".resizer:not(.internal-resizer)",
  ) as NodeListOf<HTMLElement>;
  const internalResizer = document.getElementById(
    "resizer-internal",
  ) as HTMLElement;
  let isCurrentlyResizing = false;
  let startMouseX: number;

  // Main container resizers
  resizers.forEach((resizer, resizerIndex) => {
    resizer.addEventListener("mousedown", (event: MouseEvent) => {
      isCurrentlyResizing = true;
      resizer.classList.add("active");
      startMouseX = event.clientX;

      function handleMouseMove(moveEvent: MouseEvent): void {
        if (!isCurrentlyResizing) return;

        const deltaX = moveEvent.clientX - startMouseX;
        const containerWidth = container.offsetWidth;
        const currentColumns =
          getComputedStyle(container).gridTemplateColumns.split(" ");

        if (resizerIndex === 0) {
          // First resizer (between folder and editor-preview)
          const currentLeftWidth = parseFloat(currentColumns[0]);
          const currentChatWidth = parseFloat(currentColumns[4]);

          let newLeftWidth = currentLeftWidth + deltaX;

          // Minimum width constraints - all panels minimum 300px
          const minPanelWidth = 300;

          // Calculate the maximum allowed width for the folder panel
          // It cannot be so large that it makes the middle or chat panel smaller than minimum
          const maxLeftWidth =
            containerWidth - minPanelWidth - minPanelWidth - 12;

          // Apply constraints
          newLeftWidth = Math.max(
            minPanelWidth,
            Math.min(maxLeftWidth, newLeftWidth),
          );

          // Calculate new middle width
          let newMiddleWidth =
            containerWidth - newLeftWidth - currentChatWidth - 12;

          // If the new middle width would be less than minimum, adjust accordingly
          if (newMiddleWidth < minPanelWidth) {
            newMiddleWidth = minPanelWidth;
            newLeftWidth =
              containerWidth - newMiddleWidth - currentChatWidth - 12;
            if (newLeftWidth < minPanelWidth) {
              newLeftWidth = minPanelWidth;
              newMiddleWidth =
                containerWidth - newLeftWidth - currentChatWidth - 12;
            }
          }

          const finalMiddleWidth = newMiddleWidth;

          container.style.gridTemplateColumns = `${newLeftWidth}px 6px ${finalMiddleWidth}px 6px ${currentChatWidth}px`;
        } else if (resizerIndex === 1) {
          // Second resizer (between editor-preview and chat)
          const currentLeftWidth = parseFloat(currentColumns[0]);
          const currentChatWidth = parseFloat(currentColumns[4]);

          let newChatWidth = currentChatWidth - deltaX;

          // Minimum width constraints - all panels minimum 300px
          const minPanelWidth = 300;

          // Calculate the maximum allowed width for the chat panel
          // It cannot be so large that it makes the left or middle panel smaller than minimum
          const maxChatWidth =
            containerWidth - minPanelWidth - minPanelWidth - 12;

          // Apply constraints
          newChatWidth = Math.max(
            minPanelWidth,
            Math.min(maxChatWidth, newChatWidth),
          );

          // Calculate new middle width
          let newMiddleWidth =
            containerWidth - currentLeftWidth - newChatWidth - 12;

          // If the new middle width would be less than minimum, adjust accordingly
          if (newMiddleWidth < minPanelWidth) {
            newMiddleWidth = minPanelWidth;
            newChatWidth =
              containerWidth - currentLeftWidth - newMiddleWidth - 12;
            if (newChatWidth < minPanelWidth) {
              newChatWidth = minPanelWidth;
              newMiddleWidth =
                containerWidth - currentLeftWidth - newChatWidth - 12;
            }
          }

          const finalMiddleWidth = newMiddleWidth;

          container.style.gridTemplateColumns = `${currentLeftWidth}px 6px ${finalMiddleWidth}px 6px ${newChatWidth}px`;
        }

        startMouseX = moveEvent.clientX;
      }

      function handleMouseUp(): void {
        isCurrentlyResizing = false;
        resizer.classList.remove("active");
        document.body.style.cursor = "";
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      }

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      event.preventDefault(); // Prevent text selection
    });
  });

  // Internal resizer between editor and preview
  if (internalResizer) {
    internalResizer.addEventListener("mousedown", (event: MouseEvent) => {
      isCurrentlyResizing = true;
      internalResizer.classList.add("active");
      startMouseX = event.clientX;

      const editorPreviewContainer = document.querySelector(
        ".editor-preview-container",
      ) as HTMLElement;
      const editorPanel = document.querySelector(
        ".panel-markdown",
      ) as HTMLElement;
      const previewPanel = document.querySelector(
        ".panel-preview",
      ) as HTMLElement;

      function handleMouseMove(moveEvent: MouseEvent): void {
        if (!isCurrentlyResizing || !editorPreviewContainer) return;

        const deltaX = moveEvent.clientX - startMouseX;
        const containerRect = editorPreviewContainer.getBoundingClientRect();

        const currentEditorWidth = editorPanel.offsetWidth;

        let newEditorWidth = currentEditorWidth + deltaX;

        // Minimum width constraints - both panels minimum 300px
        const minPanelWidth = 300;
        const maxEditorWidth = containerRect.width - minPanelWidth - 6; // 6px for resizer

        newEditorWidth = Math.max(
          minPanelWidth,
          Math.min(maxEditorWidth, newEditorWidth),
        );

        // Set flex-basis to maintain proportions
        editorPanel.style.flexBasis = `${newEditorWidth}px`;
        previewPanel.style.flexBasis = `${containerRect.width - newEditorWidth - 6}px`; // 6px for resizer

        startMouseX = moveEvent.clientX;
      }

      function handleMouseUp(): void {
        isCurrentlyResizing = false;
        internalResizer.classList.remove("active");
        document.body.style.cursor = "";
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      }

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      event.preventDefault(); // Prevent text selection
    });
  }
}

// Cross-platform keyboard shortcut handling
document.addEventListener("keydown", (event) => {
  // Detect platform for cross-platform shortcuts
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

  // File menu shortcuts
  if (cmdOrCtrl) {
    switch (event.key.toLowerCase()) {
      case 'n':
        event.preventDefault();
        newFile();
        break;
      case 'o':
        if (event.shiftKey) {
          event.preventDefault();
          const openFolderButton = document.getElementById("open-folder") as HTMLButtonElement;
          if (openFolderButton) openFolderButton.click();
        } else {
          event.preventDefault();
          openFile();
        }
        break;
      case 's':
        event.preventDefault();
        if (event.shiftKey) {
          saveFileAs();
        } else {
          saveFile();
        }
        break;
      case 'e':
        event.preventDefault();
        if (event.shiftKey) {
          exportPdf();
        } else {
          exportHtml();
        }
        break;
      case 'q':
        event.preventDefault();
        exitApp();
        break;
      case 't':
        if (event.shiftKey) {
          event.preventDefault();
          const themeToggle = document.getElementById("toggle-theme") as HTMLButtonElement;
          if (themeToggle) themeToggle.click();
        } else {
          event.preventDefault();
          newFile();
        }
        break;
    }
  }

  // Edit menu shortcuts
  if (cmdOrCtrl) {
    if (event.key === "z" && !event.shiftKey) {
      event.preventDefault();
      undo();
    } else if ((event.key === "y") || (event.key === "z" && event.shiftKey)) {
      event.preventDefault();
      redo();
    }
  }

  // Toolbar formatting shortcuts
  if (cmdOrCtrl) {
    switch (event.key.toLowerCase()) {
      case 'b':
        event.preventDefault();
        const boldButton = document.getElementById("toolbar-bold");
        if (boldButton) boldButton.click();
        break;
      case 'i':
        if (event.shiftKey) {
          event.preventDefault();
          const imageButton = document.getElementById("toolbar-image");
          if (imageButton) imageButton.click();
        } else {
          event.preventDefault();
          const italicButton = document.getElementById("toolbar-italic");
          if (italicButton) italicButton.click();
        }
        break;
      case 'h':
        event.preventDefault();
        const headingButton = document.getElementById("toolbar-heading");
        if (headingButton) headingButton.click();
        break;
      case 'l':
        event.preventDefault();
        const listButton = document.getElementById("toolbar-list");
        if (listButton) listButton.click();
        break;
      case '`':
        event.preventDefault();
        const codeButton = document.getElementById("toolbar-code");
        if (codeButton) codeButton.click();
        break;
      case 'q':
        event.preventDefault();
        const quoteButton = document.getElementById("toolbar-quote");
        if (quoteButton) quoteButton.click();
        break;
      case 'k':
        event.preventDefault();
        const linkButton = document.getElementById("toolbar-link");
        if (linkButton) linkButton.click();
        break;
    }
  }

  // Other shortcuts
  if (event.key === "F11") {
    event.preventDefault();
    const fullscreenButton = document.getElementById("fullscreen-preview");
    if (fullscreenButton) fullscreenButton.click();
  }
});

// Initialize all event handlers when the page loads
function initializeApplication(): void {
  setupMenuHandlers();
  setupAddTabButton();
  setupPanelResizing();
}

// Run initialization when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApplication);
} else {
  initializeApplication();
}

// Initialize big open folder button visibility
toggleBigOpenFolderButton();
