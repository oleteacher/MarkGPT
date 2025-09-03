import {
  newFile,
  openFile,
  saveFile,
  saveFileAs,
  exportHtml,
  exportPdf,
  exitApp,
} from "../utils/fileOperations";
import { undo, redo } from "../utils/history";
import { openFolderButton } from "../components/uiElements";

export function setupMenuHandlers(): void {
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
  document.getElementById("menu-undo")?.addEventListener("click", undo);
  document.getElementById("menu-redo")?.addEventListener("click", redo);
}

export function setupKeyboardShortcuts(): void {
  document.addEventListener("keydown", (event) => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey;

    if (cmdOrCtrl) {
      switch (event.key.toLowerCase()) {
        case "n":
          event.preventDefault();
          newFile();
          break;
        case "o":
          if (event.shiftKey) {
            event.preventDefault();
            if (openFolderButton) openFolderButton.click();
          } else {
            event.preventDefault();
            openFile();
          }
          break;
        case "s":
          event.preventDefault();
          if (event.shiftKey) {
            saveFileAs();
          } else {
            saveFile();
          }
          break;
        case "e":
          event.preventDefault();
          if (event.shiftKey) {
            exportPdf();
          } else {
            exportHtml();
          }
          break;
        case "q":
          event.preventDefault();
          exitApp();
          break;
        case "t":
          if (event.shiftKey) {
            event.preventDefault();
            const themeToggle = document.getElementById(
              "toggle-theme",
            ) as HTMLButtonElement;
            if (themeToggle) themeToggle.click();
          } else {
            event.preventDefault();
            newFile();
          }
          break;
      }
    }

    // Undo/Redo shortcuts
    if (cmdOrCtrl) {
      if (event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if (event.key === "y" || (event.key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    }

    // Text formatting shortcuts
    if (cmdOrCtrl) {
      switch (event.key.toLowerCase()) {
        case "b":
          event.preventDefault();
          const boldButton = document.getElementById("toolbar-bold");
          if (boldButton) boldButton.click();
          break;
        case "i":
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
        case "h":
          event.preventDefault();
          const headingButton = document.getElementById("toolbar-heading");
          if (headingButton) headingButton.click();
          break;
        case "l":
          event.preventDefault();
          const listButton = document.getElementById("toolbar-list");
          if (listButton) listButton.click();
          break;
        case "`":
          event.preventDefault();
          const codeButton = document.getElementById("toolbar-code");
          if (codeButton) codeButton.click();
          break;
        case "q":
          event.preventDefault();
          const quoteButton = document.getElementById("toolbar-quote");
          if (quoteButton) quoteButton.click();
          break;
        case "k":
          event.preventDefault();
          const linkButton = document.getElementById("toolbar-link");
          if (linkButton) linkButton.click();
          break;
      }
    }

    // Fullscreen preview
    if (event.key === "F11") {
      event.preventDefault();
      const fullscreenButton = document.getElementById("fullscreen-preview");
      if (fullscreenButton) fullscreenButton.click();
    }
  });
}

export function setupAddTabButton(): void {
  const addTabButton = document.getElementById("add-tab");
  if (addTabButton) {
    addTabButton.addEventListener("click", newFile);
  }
}
