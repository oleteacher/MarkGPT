import { statusMsg, markdownInput } from "./uiElements";

export function updateWordAndCharacterCount(): void {
  const charCountElement = document.getElementById("char-count");
  const wordCountElement = document.getElementById("word-count");

  if (!charCountElement || !wordCountElement || !markdownInput) return;

  const text = markdownInput.value;
  const characterCount = text.length;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  charCountElement.textContent = `${characterCount} characters`;
  wordCountElement.textContent = `${wordCount} words`;
}

export function setStatusMessage(message: string): void {
  if (statusMsg) {
    statusMsg.textContent = message;
  }
}
