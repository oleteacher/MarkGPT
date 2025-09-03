import {
  sendChatButton,
  chatInputBox,
  chatHistoryDiv,
} from "../components/uiElements";
import { renderMathFormulas } from "../markdown/renderer";
import { marked } from "marked";
import { getSelectedModel } from "./modelSelection";
import { Ollama } from "ollama/browser";

const ollama = new Ollama({ host: "http://127.0.0.1:11434" });

async function streamAiResponse(
  userPrompt: string,
  chatHistoryContainer: HTMLDivElement,
): Promise<void> {
  const aiMessageDiv = document.createElement("div");
  aiMessageDiv.className = "msg ai";
  aiMessageDiv.innerHTML = `
    <details>
      <summary>🤔 Model Thinking</summary>
      <pre class="think-content" style="white-space: pre-wrap; margin: 0;"></pre>
    </details>
    <div class="ai-response">
      <i class="fas fa-robot"></i>
      <div class="ai-text"></div>
    </div>
    <button class="copy-btn" style="margin: 0.5em 0; padding: 0.3em 1em; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer;">
      <i class="fas fa-copy"></i> Copy Response
    </button>
  `;

  chatHistoryContainer.appendChild(aiMessageDiv);

  const thinkingPre = aiMessageDiv.querySelector(
    ".think-content",
  ) as HTMLPreElement;
  const responseDiv = aiMessageDiv.querySelector(".ai-text") as HTMLDivElement;
  const copyBtn = aiMessageDiv.querySelector(".copy-btn") as HTMLButtonElement;

  let visibleContent = "";
  let thinkingContent = "";
  let buffer = "";
  let insideThinkTag = false;

  // Setup copy functionality
  copyBtn.onclick = async () => {
    try {
      await navigator.clipboard.writeText(visibleContent);
      copyBtn.innerHTML = "Copied!";
      setTimeout(
        () => (copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Response'),
        1200,
      );
    } catch {
      copyBtn.innerHTML = "Copy failed";
    }
  };

  const updateDisplay = () => {
    responseDiv.innerHTML = `<div class="ai-text">${marked.parse(visibleContent)}</div>`;
    thinkingPre.textContent = thinkingContent;
    renderMathFormulas();
    chatHistoryContainer.scrollTop = chatHistoryContainer.scrollHeight;
  };

  const processChunk = (text: string) => {
    buffer += text;

    while (true) {
      const openIndex = buffer.indexOf("<think>");
      const closeIndex = buffer.indexOf("</think>");

      if (openIndex === -1 && closeIndex === -1) {
        // No tags found - append all to current context
        if (insideThinkTag) {
          thinkingContent += buffer;
        } else {
          visibleContent += buffer;
        }
        buffer = "";
        break;
      }

      // Find the next tag
      let nextTagIndex = -1;
      let isOpenTag = false;

      if (openIndex !== -1 && closeIndex !== -1) {
        // Both tags present - process the earlier one
        if (openIndex < closeIndex) {
          nextTagIndex = openIndex;
          isOpenTag = true;
        } else {
          nextTagIndex = closeIndex;
          isOpenTag = false;
        }
      } else if (openIndex !== -1) {
        // Only open tag
        nextTagIndex = openIndex;
        isOpenTag = true;
      } else {
        // Only close tag
        nextTagIndex = closeIndex;
        isOpenTag = false;
      }

      // Process text before the tag
      const textBeforeTag = buffer.slice(0, nextTagIndex);
      if (textBeforeTag) {
        if (insideThinkTag) {
          thinkingContent += textBeforeTag;
        } else {
          visibleContent += textBeforeTag;
        }
      }

      // Update state and buffer based on tag type
      if (isOpenTag) {
        insideThinkTag = true;
        buffer = buffer.slice(nextTagIndex + 7); // Remove '<think>'
      } else {
        insideThinkTag = false;
        buffer = buffer.slice(nextTagIndex + 8); // Remove '</think>'
      }
    }

    updateDisplay();
  };

  try {
    // Ollama.js streaming with real-time tag processing
    const response = await ollama.chat({
      model: getSelectedModel(),
      messages: [{ role: "user", content: userPrompt }],
      stream: true,
    });

    // Process each chunk immediately as it arrives
    for await (const part of response) {
      if (part.message?.content) {
        processChunk(part.message.content);
      }
    }
  } catch (error) {
    throw new Error(`Ollama request failed: ${error}`);
  }
}

// Ultra-simple chat initialization
export function initializeChat(): void {
  if (!sendChatButton || !chatInputBox || !chatHistoryDiv) return;

  const sendMessage = async () => {
    const message = chatInputBox.value.trim();
    if (!message) return;

    // Add user message
    chatHistoryDiv.innerHTML += `
      <div class="msg user">
        <i class="fas fa-user"></i> ${message.replace(/\n/g, "<br>")}
      </div>
    `;

    chatInputBox.value = "";
    chatHistoryDiv.scrollTop = chatHistoryDiv.scrollHeight;

    try {
      await streamAiResponse(message, chatHistoryDiv);
    } catch (error) {
      chatHistoryDiv.innerHTML += `
        <div class="msg ai error">
          <i class="fas fa-robot"></i> Error: ${error}
        </div>
      `;
    }
  };

  // Enter key handler
  chatInputBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Send button handler
  sendChatButton.onclick = sendMessage;
}
