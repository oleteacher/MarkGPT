import { markdownInput, markdownPreview } from "../components/uiElements";
import { marked } from "marked";
import { renderMathFormulas } from "../markdown/renderer";
import { updateWordAndCharacterCount } from "../components/statusBar";
import { debouncedAddToHistory } from "../utils/history";
import { updateCurrentTabContent } from "../utils/tabManagement";

export function initializeMarkdownInputHandlers(): void {
  if (markdownInput) {
    markdownInput.addEventListener("input", async () => {
      // Update tab content
      updateCurrentTabContent(markdownInput.value);

      // Add to history
      debouncedAddToHistory(markdownInput.value);

      // Update preview
      const parseResult = marked.parse(markdownInput.value);
      if (typeof parseResult === "string") {
        if (markdownPreview) markdownPreview.innerHTML = parseResult;
      } else {
        if (markdownPreview) markdownPreview.innerHTML = await parseResult;
      }

      // Render math and update counts
      renderMathFormulas();
      updateWordAndCharacterCount();
    });
  }
}
