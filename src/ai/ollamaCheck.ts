import {
  chatInputBox,
  sendChatButton,
  selectionEditButton,
  modelSelectDropdown,
  statusMsg,
} from "../components/uiElements";
import { loadAvailableModels } from "./modelSelection";

export let isOllamaAvailable = false;

export async function checkOllamaAvailability(): Promise<boolean> {
  try {
    const response = await fetch("http://127.0.0.1:11434/api/tags", {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    return response.ok;
  } catch (error) {
    console.log("Ollama not available:", error);
    return false;
  }
}

export function showOllamaWarningModal(): void {
  const modal = document.createElement("div");
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const modalContent = document.createElement("div");
  modalContent.style.cssText = `
    background: var(--bg-primary, #ffffff);
    border-radius: 12px;
    padding: 30px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    text-align: center;
    border: 1px solid var(--border, #e0e0e0);
  `;

  const warningIcon = document.createElement("div");
  warningIcon.innerHTML = `<i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ff6b35; margin-bottom: 20px;"></i>`;

  const title = document.createElement("h2");
  title.textContent = "Ollama Not Detected";
  title.style.cssText = `
    margin: 0 0 15px 0;
    color: var(--text-primary, #333333);
    font-size: 24px;
    font-weight: 600;
  `;

  const description = document.createElement("p");
  description.textContent =
    "This application requires Ollama to be installed and running for AI features to work. Please install and start Ollama to use the chat and text editing features.";
  description.style.cssText = `
    margin: 0 0 25px 0;
    color: var(--text-secondary, #666666);
    line-height: 1.5;
    font-size: 16px;
  `;

  const instructions = document.createElement("div");
  instructions.style.cssText = `
    background: var(--bg-secondary, #f8f9fa);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 25px;
    text-align: left;
  `;

  instructions.innerHTML = `
    <h3 style="margin: 0 0 15px 0; color: var(--text-primary, #333333); font-size: 18px;">To install Ollama:</h3>
    <ol style="margin: 0; padding-left: 20px; color: var(--text-secondary, #666666);">
      <li style="margin-bottom: 8px;">Visit <a href="https://ollama.ai" target="_blank" style="color: #007acc; text-decoration: none;">ollama.ai</a></li>
      <li style="margin-bottom: 8px;">Download and install Ollama for your operating system</li>
      <li style="margin-bottom: 8px;">Start Ollama by running: <code style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-family: monospace;">ollama serve</code></li>
      <li>Pull a model: <code style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-family: monospace;">ollama pull llama2</code> or <code style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-family: monospace;">ollama pull codellama</code></li>
    </ol>
  `;

  const buttonsContainer = document.createElement("div");
  buttonsContainer.style.cssText = `
    display: flex;
    gap: 15px;
    justify-content: center;
    flex-wrap: wrap;
  `;

  const retryButton = document.createElement("button");
  retryButton.textContent = "Retry Connection";
  retryButton.style.cssText = `
    padding: 12px 24px;
    background: var(--accent, #007acc);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    transition: background-color 0.2s;
  `;

  retryButton.onmouseover = () => {
    retryButton.style.background = "#0056b3";
  };
  retryButton.onmouseout = () => {
    retryButton.style.background = "var(--accent, #007acc)";
  };

  const continueButton = document.createElement("button");
  continueButton.textContent = "Continue Without AI";
  continueButton.style.cssText = `
    padding: 12px 24px;
    background: var(--bg-secondary, #f8f9fa);
    color: var(--text-primary, #333333);
    border: 1px solid var(--border, #e0e0e0);
    border-radius: 6px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    transition: background-color 0.2s;
  `;

  continueButton.onmouseover = () => {
    continueButton.style.background = "#e9ecef";
  };
  continueButton.onmouseout = () => {
    continueButton.style.background = "var(--bg-secondary, #f8f9fa)";
  };

  retryButton.onclick = async () => {
    document.body.removeChild(modal);
    await initializeOllamaCheck();
  };

  continueButton.onclick = () => {
    document.body.removeChild(modal);
    disableAIFeatures();
  };

  buttonsContainer.appendChild(retryButton);
  buttonsContainer.appendChild(continueButton);

  modalContent.appendChild(warningIcon);
  modalContent.appendChild(title);
  modalContent.appendChild(description);
  modalContent.appendChild(instructions);
  modalContent.appendChild(buttonsContainer);

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      document.body.removeChild(modal);
      disableAIFeatures();
    }
  });
}

export function disableAIFeatures(): void {
  if (chatInputBox) {
    chatInputBox.disabled = true;
    chatInputBox.placeholder = "AI chat unavailable - Ollama not running";
  }

  if (sendChatButton) {
    sendChatButton.disabled = true;
  }

  if (selectionEditButton) {
    selectionEditButton.disabled = true;
    selectionEditButton.title = "AI features unavailable - Ollama not running";
  }

  if (modelSelectDropdown) {
    modelSelectDropdown.disabled = true;
  }

  if (statusMsg) {
    statusMsg.textContent = "Ollama not available - AI features disabled";
  }
}

export function enableAIFeatures(): void {
  if (chatInputBox) {
    chatInputBox.disabled = false;
    chatInputBox.placeholder = "Ask me anything...";
  }

  if (sendChatButton) {
    sendChatButton.disabled = false;
  }

  if (selectionEditButton) {
    selectionEditButton.disabled = false;
    selectionEditButton.title = "Edit with AI";
  }

  if (modelSelectDropdown) {
    modelSelectDropdown.disabled = false;
  }
}

export async function initializeOllamaCheck(): Promise<void> {
  isOllamaAvailable = await checkOllamaAvailability();

  if (!isOllamaAvailable) {
    showOllamaWarningModal();
  } else {
    enableAIFeatures();
    if (modelSelectDropdown) {
      loadAvailableModels();
    }
  }
}
