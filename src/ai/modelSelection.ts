import { modelSelectDropdown } from '../components/uiElements';
import { Ollama } from 'ollama/browser';

const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

let selectedModel = '';

export async function loadAvailableModels(): Promise<void> {
    try {
        const { models } = await ollama.list();

        modelSelectDropdown.innerHTML = models
            .map(
                (model) =>
                    `<option value="${model.name}">${model.name}</option>`
            )
            .join('');

        selectedModel = modelSelectDropdown.value;
    } catch {
        modelSelectDropdown.innerHTML = `<option>Error loading models</option>`;
    }
}

export function initializeModelSelection(): void {
    loadAvailableModels();
    modelSelectDropdown.onchange = (): string =>
        (selectedModel = modelSelectDropdown.value);
}

export function getSelectedModel(): string {
    return selectedModel;
}
