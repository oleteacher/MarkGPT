import { save, open } from "@tauri-apps/plugin-dialog";
import {
  writeTextFile,
  readTextFile,
  writeFile,
  readFile,
} from "@tauri-apps/plugin-fs";
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

import html2canvas from "html2canvas";

export async function exportPdf(): Promise<void> {
  try {
    if (activeTabIndex < 0) return;

    const selectedPath = await save({
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });
    if (!selectedPath) return;

    // Render Markdown -> HTML
    let htmlContent = await marked.parse(markdownInput.value);

    // Convert local images to data URLs
    const imgRegex = /<img[^>]+src="([^"]+)"/g;
    let match: RegExpExecArray | null;
    const currentTab = allTabs[activeTabIndex];
    const basePath = currentTab.path
      ? currentTab.path.replace(/[^/]+$/, "")
      : "";
    while ((match = imgRegex.exec(htmlContent)) !== null) {
      const src = match[1];
      if (!src.startsWith("http") && !src.startsWith("data:")) {
        try {
          const imagePath = src.startsWith("/") ? src : `${basePath}${src}`;
          const imageData = await readFile(imagePath); // Uint8Array
          const base64 = btoa(String.fromCharCode(...imageData));
          const mimeType = src.endsWith(".png")
            ? "image/png"
            : src.endsWith(".jpg") || src.endsWith(".jpeg")
              ? "image/jpeg"
              : "image/png";
          const dataUrl = `data:${mimeType};base64,${base64}`;
          htmlContent = htmlContent.replace(
            match[0],
            match[0].replace(src, dataUrl),
          );
        } catch (e) {
          console.warn("Could not load image:", src, e);
        }
      }
    }

    // Create a hidden container with the HTML to render
    const doc = new jsPDF({
      unit: "mm",
      format: "a4",
      putOnlyUsedFonts: true,
      floatPrecision: 16,
    });

    const pageWidthMm = doc.internal.pageSize.getWidth(); // 210 for A4
    const pageHeightMm = doc.internal.pageSize.getHeight(); // 297 for A4

    // margins (mm)
    const marginLeft = 15;
    const marginRight = 15;
    const marginTop = 20;
    const marginBottom = 20;
    const usableWidthMm = pageWidthMm - marginLeft - marginRight;
    const usableHeightMm = pageHeightMm - marginTop - marginBottom;

    // Convert mm -> px (CSS px @ 96dpi)
    const pxPerMm = 96 / 25.4;
    const tempDivPxWidth = Math.floor(usableWidthMm * pxPerMm);

    const tempDiv = document.createElement("div");
    tempDiv.style.boxSizing = "border-box";
    tempDiv.style.width = `${tempDivPxWidth}px`; // CSS px
    tempDiv.style.padding = "0";
    tempDiv.style.margin = "0";
    tempDiv.style.fontFamily = "Arial, sans-serif";
    tempDiv.style.color = "black";
    tempDiv.style.backgroundColor = "white";
    tempDiv.style.lineHeight = "1.6";
    tempDiv.style.wordWrap = "break-word";
    // keep page-break-friendly rules
    const style = document.createElement("style");
    style.textContent = `
      * { color: black !important; background: white !important; font-family: Arial, sans-serif !important; }
      h1,h2,h3,h4,h5,h6 { page-break-after: avoid; page-break-inside: avoid; }
      pre, table, blockquote, img { page-break-inside: avoid; }
      .pagebreak { page-break-before: always; break-before: page; }
      img { max-width: 100%; height: auto; }
      code { background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }
      pre { background: #f4f4f4; padding: 10px; border-radius: 5px; margin-bottom: 15px; overflow: auto; }
    `;
    tempDiv.appendChild(style);
    const contentWrapper = document.createElement("div");
    contentWrapper.innerHTML = htmlContent;
    tempDiv.appendChild(contentWrapper);

    // Append off-screen so fonts/styles apply
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    tempDiv.style.top = "0";
    document.body.appendChild(tempDiv);

    // html2canvas scale (use a higher scale for crispness)
    const scale = Math.max(window.devicePixelRatio || 1, 2);

    // Render the full content to a single high-res canvas
    const canvas = await html2canvas(tempDiv, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    // Clean up the temporary DOM element
    document.body.removeChild(tempDiv);

    // Canvas dimensions in px
    const canvasWidthPx = canvas.width;
    const canvasHeightPx = canvas.height;

    // Height of one PDF page in pixels (taking scale into account)
    const pageHeightPx = Math.floor(usableHeightMm * pxPerMm * scale);

    // Slice the canvas into page-height chunks and insert into PDF as images
    let yOffset = 0;
    let pageIndex = 0;
    while (yOffset < canvasHeightPx) {
      const sliceHeightPx = Math.min(pageHeightPx, canvasHeightPx - yOffset);

      // create a temporary canvas for the slice
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvasWidthPx;
      sliceCanvas.height = sliceHeightPx;
      const ctx = sliceCanvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      // draw the slice from the main canvas
      ctx.drawImage(
        canvas,
        0,
        yOffset,
        canvasWidthPx,
        sliceHeightPx,
        0,
        0,
        canvasWidthPx,
        sliceHeightPx,
      );

      // convert slice to image
      const imgData = sliceCanvas.toDataURL("image/png", 1.0);

      // convert slice pixel height back to mm for PDF sizing
      const imgHeightMm = sliceHeightPx / (pxPerMm * scale);

      if (pageIndex > 0) doc.addPage();
      doc.addImage(
        imgData,
        "PNG",
        marginLeft,
        marginTop,
        usableWidthMm,
        imgHeightMm,
      );

      pageIndex++;
      yOffset += sliceHeightPx;
    }

    // Output and write file
    const pdfOutput = doc.output("arraybuffer");
    await writeFile(selectedPath, new Uint8Array(pdfOutput));

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
