import {
    chatInputBox,
    sendChatButton,
    selectionEditButton,
    modelSelectDropdown,
    statusMsg,
} from '../components/uiElements';
import { loadAvailableModels } from './modelSelection';
import { Ollama } from 'ollama/browser';

const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

export let isOllamaAvailable = false;

async function checkOllamaAvailability(): Promise<boolean> {
    try {
        await ollama.list();
        return true;
    } catch {
        return false;
    }
}

function createModal(): HTMLDivElement {
    const modal = document.createElement('div');
    modal.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: rgba(0,0,0,0.7); display: flex; align-items: center; 
                justify-content: center; z-index: 10000;">
      <div style="background: white; border-radius: 12px; padding: 30px; 
                  max-width: 500px; width: 90%; text-align: center;">
        <div style="font-size: 48px; color: #ff6b35; margin-bottom: 20px;">⚠️</div>
        <h2 style="margin: 0 0 15px 0;">Ollama Not Detected</h2>
        <p style="margin: 0 0 25px 0; color: #666;">
          Install and start Ollama to use AI features.
        </p>
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: left;">
          <h3 style="margin: 0 0 15px 0;">Quick setup:</h3>
          <ol style="margin: 0; padding-left: 20px;">
            <li>Visit <a href="https://ollama.ai" target="_blank">ollama.ai</a></li>
            <li>Download and install</li>
            <li>Run: <code>ollama serve</code></li>
            <li>Pull a model: <code>ollama pull llama2</code></li>
          </ol>
        </div>
        <button id="retry-btn" style="padding: 12px 24px; background: #007acc; 
                                      color: white; border: none; border-radius: 6px; 
                                      cursor: pointer; margin-right: 10px;">
          Retry Connection
        </button>
        <button id="continue-btn" style="padding: 12px 24px; background: #f8f9fa; 
                                        border: 1px solid #e0e0e0; border-radius: 6px; 
                                        cursor: pointer;">
          Continue Without AI
        </button>
      </div>
    </div>
  `;
    const retryBtn = modal.querySelector('#retry-btn') as HTMLButtonElement;
    retryBtn.onclick = (): void => {
        document.body.removeChild(modal);
        initializeOllamaCheck();
    };
    const continueBtn = modal.querySelector(
        '#continue-btn'
    ) as HTMLButtonElement;
    continueBtn.onclick = (): void => {
        document.body.removeChild(modal);
        disableAIFeatures();
    };

    return modal;
}

function disableAIFeatures(): void {
    const elements = [
        {
            el: chatInputBox,
            props: {
                disabled: true,
                placeholder: 'AI unavailable - Ollama not running',
            },
        },
        { el: sendChatButton, props: { disabled: true } },
        {
            el: selectionEditButton,
            props: {
                disabled: true,
                title: 'AI unavailable - Ollama not running',
            },
        },
        { el: modelSelectDropdown, props: { disabled: true } },
    ];

    elements.forEach(({ el, props }) => {
        if (el) Object.assign(el, props);
    });

    if (statusMsg) statusMsg.textContent = 'Ollama not available';
}

function enableAIFeatures(): void {
    const elements = [
        {
            el: chatInputBox,
            props: { disabled: false, placeholder: 'Ask me anything...' },
        },
        { el: sendChatButton, props: { disabled: false } },
        {
            el: selectionEditButton,
            props: { disabled: false, title: 'Edit with AI' },
        },
        { el: modelSelectDropdown, props: { disabled: false } },
    ];

    elements.forEach(({ el, props }) => {
        if (el) Object.assign(el, props);
    });
}

export async function initializeOllamaCheck(): Promise<void> {
    isOllamaAvailable = await checkOllamaAvailability();

    if (isOllamaAvailable) {
        enableAIFeatures();
        loadAvailableModels();
    } else {
        document.body.appendChild(createModal());
    }
}
