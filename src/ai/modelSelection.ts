import { modelSelectDropdown } from "../components/uiElements";

export let selectedAiModel = "qwen3:0.6b";

export async function loadAvailableModels(): Promise<void> {
  try {
    const response = await fetch("http://127.0.0.1:11434/api/tags");
    const data = await response.json();

    if (Array.isArray(data.models) && modelSelectDropdown) {
      modelSelectDropdown.innerHTML = "";

      data.models.forEach((model: any) => {
        const option = document.createElement("option");
        option.value = model.name;
        option.textContent = model.name;
        modelSelectDropdown.appendChild(option);
      });

      selectedAiModel = modelSelectDropdown.value;
    }
  } catch (error) {
    if (modelSelectDropdown) {
      modelSelectDropdown.innerHTML = `<option>Error loading models</option>`;
    }
  }
}

export function initializeModelSelection(): void {
  if (modelSelectDropdown) {
    loadAvailableModels();

    modelSelectDropdown.addEventListener("change", () => {
      selectedAiModel = modelSelectDropdown.value;
    });
  }
}

export function getSelectedModel(): string {
  return selectedAiModel;
}

export function setSelectedModel(model: string): void {
  selectedAiModel = model;
  if (modelSelectDropdown) {
    modelSelectDropdown.value = model;
  }
}
