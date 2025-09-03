import {
  sendChatButton,
  chatInputBox,
  chatHistoryDiv,
} from "../components/uiElements";
import { renderMathFormulas } from "../markdown/renderer";
import { marked } from "marked";
import { getSelectedModel } from "./modelSelection";

async function streamAiResponse(
  userPrompt: string,
  chatHistoryContainer: HTMLDivElement,
): Promise<void> {
  const response = await fetch("http://127.0.0.1:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: getSelectedModel(),
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

  const aiMessageDiv = document.createElement("div");
  aiMessageDiv.className = "msg ai";

  const thinkingDetails = document.createElement("details");
  const thinkingSummary = document.createElement("summary");
  thinkingSummary.textContent = "🤔 Model Thinking";

  const thinkingContent = document.createElement("pre");
  thinkingContent.className = "think-content";
  thinkingContent.style.whiteSpace = "pre-wrap";
  thinkingContent.style.margin = "0";

  thinkingDetails.appendChild(thinkingSummary);
  thinkingDetails.appendChild(thinkingContent);

  const responseContent = document.createElement("div");
  responseContent.className = "ai-response";
  responseContent.innerHTML = `<i class="fas fa-robot"></i> `;

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

    renderMathFormulas();

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
        // Ignore JSON parsing errors
      }
    }
  }

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

export function initializeChat(): void {
  if (sendChatButton && chatInputBox && chatHistoryDiv) {
    chatInputBox.addEventListener("keydown", async function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendChatButton.click();
      }
    });

    sendChatButton.onclick = async function () {
      const userMessage = chatInputBox.value.trim();
      if (!userMessage) return;

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
}
