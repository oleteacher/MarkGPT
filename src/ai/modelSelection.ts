import { modelSelectDropdown } from "../components/uiElements";
import { Ollama } from "ollama/browser";

const ollama = new Ollama({ host: "http://127.0.0.1:11434" });

let selectedModel = "";

export async function loadAvailableModels() {
  try {
    const { models } = await ollama.list();

    modelSelectDropdown.innerHTML = models
      .map((model) => `<option value="${model.name}">${model.name}</option>`)
      .join("");

    selectedModel = modelSelectDropdown.value;
  } catch (_) {
    modelSelectDropdown.innerHTML = `<option>Error loading models</option>`;
  }
}

export function initializeModelSelection() {
  loadAvailableModels();
  modelSelectDropdown.onchange = () =>
    (selectedModel = modelSelectDropdown.value);
}

export function getSelectedModel() {
  return selectedModel;
}
