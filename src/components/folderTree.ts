import { open as openFolderDialog } from "@tauri-apps/plugin-dialog";
import {
  readDir,
  exists,
  mkdir,
  writeTextFile,
  readTextFile,
} from "@tauri-apps/plugin-fs";
import {
  folderTreeContainer,
  openFolderButton,
  openFolderBigButton,
  newFileButton,
  newFolderButton,
  statusMsg,
  markdownInput,
  markdownPreview,
} from "./uiElements";
import { marked } from "marked";
import { renderMathFormulas } from "../markdown/renderer";
import { updateWordAndCharacterCount } from "./statusBar";
import { MAX_DEPTH } from "../constants";
import {
  createNewTab,
  isFileAlreadyOpen,
  switchToTab,
  allTabs,
} from "../utils/tabManagement";

export let currentFolderPath: string | null = null;
export let selectedFolderPath: string | null = null;
let currentWatcher: any = null;

export async function customPrompt(
  title: string,
  placeholder: string = "",
): Promise<string | null> {
  return new Promise((resolve) => {
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

    setTimeout(() => input.focus(), 100);
    buttonContainer.appendChild(cancelButton);
    buttonContainer.appendChild(okButton);
    dialog.appendChild(titleElement);
    dialog.appendChild(input);
    dialog.appendChild(buttonContainer);
    modal.appendChild(dialog);
    document.body.appendChild(modal);
  });
}

export function toggleBigOpenFolderButton() {
  const openFolderBigContainer = document.getElementById(
    "open-folder-big",
  ) as HTMLDivElement;
  if (openFolderBigContainer) {
    if (currentFolderPath) {
      openFolderBigContainer.style.display = "none";
    } else {
      openFolderBigContainer.style.display = "flex";
    }
  }
}

export async function createFolderTree(
  path: string,
  container: HTMLDivElement,
  depth: number = 0,
) {
  container.innerHTML = ""; // Clear existing content
  if (depth > MAX_DEPTH) {
    const errorItem = document.createElement("div");
    errorItem.className = "folder-item error";
    errorItem.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Directory too deep`;
    container.appendChild(errorItem);
    return;
  }

  try {
    if (path === currentFolderPath) {
      const rootItem = document.createElement("div");
      rootItem.className = "folder-item folder root-folder";
      const folderName = path.split("/").pop() || path;
      rootItem.innerHTML = `<i class="fas fa-folder"></i> ${folderName}`;
      if (selectedFolderPath === currentFolderPath) {
        rootItem.classList.add("selected");
      }

      rootItem.addEventListener("click", (event) => {
        event.stopPropagation();
        document.querySelectorAll(".folder-item.selected").forEach((el) => {
          el.classList.remove("selected");
        });
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
        item.classList.add("folder");
        item.innerHTML = `<i class="fas fa-folder"></i> ${entry.name}`;

        const subContainer = document.createElement("div");
        subContainer.className = "folder-subtree";
        subContainer.style.display = "none";

        const fullPath = `${path}/${entry.name}`;
        if (selectedFolderPath === fullPath) {
          item.classList.add("selected");
        }

        item.addEventListener("click", async (event) => {
          event.stopPropagation();
          const wasSelected = item.classList.contains("selected");
          document.querySelectorAll(".folder-item.selected").forEach((el) => {
            el.classList.remove("selected");
          });

          if (!wasSelected) {
            item.classList.add("selected");
            selectedFolderPath = fullPath;
          } else {
            selectedFolderPath = currentFolderPath;
          }

          if (subContainer.style.display === "none") {
            subContainer.style.display = "block";
            item.innerHTML = `<i class="fas fa-folder-open"></i> ${entry.name}`;
            if (subContainer.children.length === 0) {
              try {
                await createFolderTree(fullPath, subContainer, depth + 1);
              } catch (subErr) {
                console.error("Error loading subdirectory:", subErr);
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
        item.classList.add("file");
        const isImage = /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(entry.name);
        item.innerHTML = `<i class="fas fa-${isImage ? "image" : "file"}"></i> ${entry.name}`;
        item.addEventListener("click", async () => {
          try {
            const fullPath = `${path}/${entry.name}`;

            if (isImage) {
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
            } else {
              try {
                const content = await readTextFile(fullPath);
                if (isFileAlreadyOpen(fullPath)) {
                  const existingTabIndex = allTabs.findIndex(
                    (tab) => tab.path === fullPath,
                  );
                  if (existingTabIndex !== -1) {
                    switchToTab(existingTabIndex);
                  }
                } else {
                  createNewTab(fullPath, content, entry.name, true);
                }
              } catch (readError) {
                if (statusMsg) {
                  statusMsg.textContent = `Cannot open file: ${entry.name}`;
                }
              }
            }
          } catch (err) {
            console.error("Error reading file:", err);
            if (err instanceof Error) {
              const errorMessage = err.message.toLowerCase();
              if (
                errorMessage.includes("permission") ||
                errorMessage.includes("access")
              ) {
                if (statusMsg)
                  statusMsg.textContent = `Permission denied: ${entry.name}`;
              } else if (
                errorMessage.includes("not found") ||
                errorMessage.includes("no such file")
              ) {
                if (statusMsg)
                  statusMsg.textContent = `File not found: ${entry.name}`;
              } else if (errorMessage.includes("is a directory")) {
                if (statusMsg)
                  statusMsg.textContent = `Cannot open directory as file: ${entry.name}`;
              } else {
                if (statusMsg)
                  statusMsg.textContent = `Error reading file: ${entry.name} (${err.message})`;
              }
            } else {
              if (statusMsg)
                statusMsg.textContent = `Error reading file: ${entry.name}`;
            }
          }
        });

        container.appendChild(item);
      }
    }
  } catch (err) {
    console.error("Error reading directory:", err);
    const errorItem = document.createElement("div");
    errorItem.className = "folder-item error";
    errorItem.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Error reading directory`;
    if (err instanceof Error) {
      const errorMessage = err.message.toLowerCase();
      if (
        errorMessage.includes("permission") ||
        errorMessage.includes("access")
      ) {
        errorItem.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Permission denied`;
        if (statusMsg)
          statusMsg.textContent =
            "Permission denied: Cannot access this directory";
      } else if (
        errorMessage.includes("not found") ||
        errorMessage.includes("no such file")
      ) {
        errorItem.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Directory not found`;
        if (statusMsg) statusMsg.textContent = "Directory not found";
      } else if (
        errorMessage.includes("network") ||
        errorMessage.includes("connection")
      ) {
        errorItem.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Network error`;
        if (statusMsg)
          statusMsg.textContent = "Network error: Cannot access directory";
      } else {
        if (statusMsg)
          statusMsg.textContent = `Error reading directory: ${err.message}`;
      }
    } else {
      if (statusMsg) statusMsg.textContent = "Error reading directory";
    }

    container.appendChild(errorItem);
  }
}

export async function createNewFile(): Promise<void> {
  const targetPath = selectedFolderPath || currentFolderPath;
  if (!targetPath) {
    if (statusMsg) statusMsg.textContent = "Please open a folder first";
    return;
  }

  try {
    const fileName = await customPrompt(
      "Create New File",
      "Enter file name (with extension)",
    );
    if (!fileName || !fileName.trim()) return;

    const trimmedFileName = fileName.trim();
    const filePath = `${targetPath}/${trimmedFileName}`;
    const fileExists = await exists(filePath);
    if (fileExists) {
      if (statusMsg)
        statusMsg.textContent = `File "${trimmedFileName}" already exists`;
      return;
    }

    await writeTextFile(filePath, "");
    if (folderTreeContainer && currentFolderPath) {
      const previousSelected = selectedFolderPath;
      await createFolderTree(currentFolderPath, folderTreeContainer, 0);
      if (previousSelected) {
        selectedFolderPath = previousSelected;
        const selectedElements = folderTreeContainer.querySelectorAll(
          ".folder-item.selected",
        );
        selectedElements.forEach((el) => el.classList.remove("selected"));
        const newSelected = Array.from(
          folderTreeContainer.querySelectorAll(".folder-item"),
        ).find((el) => {
          return (
            el.textContent?.includes(previousSelected.split("/").pop() || "") &&
            el.classList.contains("folder")
          );
        });
        if (newSelected) {
          newSelected.classList.add("selected");
        }
      }
    }

    if (statusMsg) statusMsg.textContent = `Created file: ${trimmedFileName}`;
  } catch (error) {
    console.error("Error creating file:", error);
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes("permission denied") ||
        errorMessage.includes("access denied")
      ) {
        if (statusMsg)
          statusMsg.textContent =
            "Permission denied: Cannot create file in this location";
      } else if (
        errorMessage.includes("no such file") ||
        errorMessage.includes("path not found")
      ) {
        if (statusMsg)
          statusMsg.textContent =
            "Path not found: Please check the folder path";
      } else if (
        errorMessage.includes("already exists") ||
        errorMessage.includes("file exists")
      ) {
        if (statusMsg) statusMsg.textContent = "File already exists";
      } else if (errorMessage.includes("forbidden path")) {
        if (statusMsg)
          statusMsg.textContent =
            "Invalid path: File name contains invalid characters or format";
      } else if (
        errorMessage.includes("forbidden") ||
        errorMessage.includes("restricted")
      ) {
        if (statusMsg)
          statusMsg.textContent = "Access forbidden: This path is restricted";
      } else {
        if (statusMsg)
          statusMsg.textContent = `Error creating file: ${error.message}`;
      }
    } else {
      if (statusMsg) statusMsg.textContent = "Error creating file";
    }
  }
}

export async function createNewFolder(): Promise<void> {
  const targetPath = selectedFolderPath || currentFolderPath;
  if (!targetPath) {
    if (statusMsg) statusMsg.textContent = "Please open a folder first";
    return;
  }

  try {
    const folderName = await customPrompt(
      "Create New Folder",
      "Enter folder name",
    );
    if (!folderName || !folderName.trim()) return;

    const folderPath = `${targetPath}/${folderName.trim()}`;
    const folderExists = await exists(folderPath);
    if (folderExists) {
      if (statusMsg)
        statusMsg.textContent = `Folder "${folderName}" already exists`;
      return;
    }

    await mkdir(folderPath, { recursive: true });
    if (folderTreeContainer && currentFolderPath) {
      const previousSelected = selectedFolderPath;
      await createFolderTree(currentFolderPath, folderTreeContainer, 0);
      if (previousSelected) {
        selectedFolderPath = previousSelected;
        const selectedElements = folderTreeContainer.querySelectorAll(
          ".folder-item.selected",
        );
        selectedElements.forEach((el) => el.classList.remove("selected"));
        const newSelected = Array.from(
          folderTreeContainer.querySelectorAll(".folder-item"),
        ).find((el) => {
          return (
            el.textContent?.includes(previousSelected.split("/").pop() || "") &&
            el.classList.contains("folder")
          );
        });
        if (newSelected) {
          newSelected.classList.add("selected");
        }
      }
    }

    if (statusMsg) statusMsg.textContent = `Created folder: ${folderName}`;
  } catch (error) {
    console.error("Error creating folder:", error);
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      if (
        errorMessage.includes("permission denied") ||
        errorMessage.includes("access denied")
      ) {
        if (statusMsg)
          statusMsg.textContent =
            "Permission denied: Cannot create folder in this location";
      } else if (
        errorMessage.includes("no such file") ||
        errorMessage.includes("path not found")
      ) {
        if (statusMsg)
          statusMsg.textContent =
            "Path not found: Please check the folder path";
      } else if (
        errorMessage.includes("already exists") ||
        errorMessage.includes("file exists")
      ) {
        if (statusMsg) statusMsg.textContent = "Folder already exists";
      } else if (errorMessage.includes("forbidden path")) {
        if (statusMsg)
          statusMsg.textContent =
            "Invalid path: Folder name contains invalid characters or format";
      } else if (
        errorMessage.includes("forbidden") ||
        errorMessage.includes("restricted")
      ) {
        if (statusMsg)
          statusMsg.textContent = "Access forbidden: This path is restricted";
      } else {
        if (statusMsg)
          statusMsg.textContent = `Error creating folder: ${error.message}`;
      }
    } else {
      if (statusMsg) statusMsg.textContent = "Error creating folder";
    }
  }
}

function watchFolderChanges(folderPath: string): void {
  if (currentWatcher) {
    clearInterval(currentWatcher as any);
    currentWatcher = null;
  }

  let lastFolderState: string = "";

  const getFolderState = async (): Promise<string> => {
    try {
      const entries = await readDir(folderPath);
      return entries
        .map((entry) => `${entry.name}:${entry.isDirectory}`)
        .sort()
        .join("|");
    } catch (err) {
      console.error("Error reading folder state:", err);
      return "";
    }
  };

  getFolderState().then((state) => {
    lastFolderState = state;
    console.log("Folder watcher started for:", folderPath);
  });

  const intervalId = setInterval(async () => {
    if (!currentFolderPath || !folderTreeContainer) return;

    try {
      const currentState = await getFolderState();
      if (currentState !== lastFolderState && currentState !== "") {
        console.log("File system change detected, refreshing folder tree");
        lastFolderState = currentState;
        await createFolderTree(currentFolderPath, folderTreeContainer, 0);
      }
    } catch (err) {
      console.error("Error checking folder changes:", err);
    }
  }, 2000);

  currentWatcher = intervalId as any;
}

export function initializeFolderTreeHandlers(): void {
  if (newFileButton) {
    newFileButton.addEventListener("click", createNewFile);
  }
  if (newFolderButton) {
    newFolderButton.addEventListener("click", createNewFolder);
  }

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
          watchFolderChanges(currentFolderPath);
        }
      } catch (err) {
        console.error("Error opening folder:", err);
        if (statusMsg) statusMsg.textContent = `Error opening folder`;
      }
    });
  }

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
          watchFolderChanges(currentFolderPath);
        }
      } catch (err) {
        console.error("Error opening folder:", err);
        if (statusMsg) statusMsg.textContent = `Error opening folder`;
      }
    });
  }
}

// Create the new toolbar for file/folder buttons
export function createNewFileToolbar(): void {
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

    if (newFileButton) {
      newToolbar.appendChild(newFileButton);
    }
    if (newFolderButton) {
      newToolbar.appendChild(newFolderButton);
    }
    folderTreeContainer.insertAdjacentElement("afterend", newToolbar);
  }
}
