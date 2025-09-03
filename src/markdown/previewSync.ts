import { markdownInput, markdownPreview } from "../components/uiElements";

export function initializePreviewSync(): void {
  if (markdownInput && markdownPreview) {
    markdownInput.addEventListener("scroll", () => {
      const inputScrollRatio =
        markdownInput.scrollTop /
        (markdownInput.scrollHeight - markdownInput.clientHeight || 1);
      markdownPreview.scrollTop =
        inputScrollRatio *
        (markdownPreview.scrollHeight - markdownPreview.clientHeight || 1);
    });
  }
}
