import { markdownInput } from "../components/uiElements";

let textFormattingButtonsInitialized = false;

export function wrapSelectedText(
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
  markdownInput.setSelectionRange(
    startPosition + beforeText.length,
    startPosition + beforeText.length + selectedText.length,
  );

  markdownInput.dispatchEvent(new Event("input"));
}

export function setupTextFormattingButtons(): void {
  if (textFormattingButtonsInitialized) return;
  textFormattingButtonsInitialized = true;
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
}
