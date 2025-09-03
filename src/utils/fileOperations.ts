import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile, writeFile } from "@tauri-apps/plugin-fs";
import { exit } from "@tauri-apps/plugin-process";
import { marked } from "marked";
import jsPDF from "jspdf";
import {
  allTabs,
  activeTabIndex,
  createNewTab,
  refreshTabsDisplay,
} from "./tabManagement";
import { markdownInput, statusMsg } from "../components/uiElements";

export async function saveFile(): Promise<void> {
  try {
    if (activeTabIndex < 0) return;

    const currentTab = allTabs[activeTabIndex];
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
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.fontSize = "12px";
    tempDiv.style.lineHeight = "1.5";
    tempDiv.style.padding = "20px";

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
