import {
    markdownInput,
    selectionToolbar,
    selectionEditButton,
    selectionModal,
    selectedTextPreview,
    selectionPromptInput,
    selectionResponseTextarea,
    acceptSelectionButton,
    rejectSelectionButton,
    closeSelectionModal,
    markdownPreview,
} from '../components/uiElements';
import { getCaretCoordinates } from './caretUtils';
import { marked } from 'marked';
import { renderMathFormulas } from '../markdown/renderer';
import { updateWordAndCharacterCount } from '../components/statusBar';
import { debouncedAddToHistory } from './history';
import { modelSelectDropdown } from '../components/uiElements';

let currentSelection = { start: 0, end: 0, text: '' };
let selectedAiModel = 'qwen3:0.6b';

function getTextareaSelection(): {
    start: number;
    end: number;
    text: string;
} | null {
    if (!markdownInput) return null;

    const start = markdownInput.selectionStart;
    const end = markdownInput.selectionEnd;
    const text = markdownInput.value.slice(start, end);

    if (start !== end && text.trim()) {
        return { start, end, text };
    }
    return null;
}

function positionToolbar(selection: { start: number; end: number }): void {
    if (!markdownInput || !selectionToolbar) return;

    const textareaRect = markdownInput.getBoundingClientRect();
    const startPos = getCaretCoordinates(markdownInput, selection.start);
    let toolbarX =
        textareaRect.left + (startPos.left - markdownInput.scrollLeft);
    let toolbarY =
        textareaRect.top + (startPos.top - markdownInput.scrollTop) - 40; // 40px above

    // Ensure toolbar stays within viewport bounds
    const toolbarWidth = 120; // Approximate width of toolbar
    const toolbarHeight = 30; // Approximate height of toolbar
    const margin = 10;

    if (toolbarY < margin) {
        toolbarY = margin;
    }
    if (toolbarY + toolbarHeight > window.innerHeight) {
        toolbarY = window.innerHeight - toolbarHeight - margin;
    }
    if (toolbarX < margin) {
        toolbarX = margin;
    }
    if (toolbarX + toolbarWidth > window.innerWidth) {
        toolbarX = window.innerWidth - toolbarWidth - margin;
    }

    selectionToolbar.style.left = `${toolbarX}px`;
    selectionToolbar.style.top = `${toolbarY}px`;
    selectionToolbar.style.display = 'flex';
}

async function generateSelectionSuggestion(): Promise<void> {
    const userPrompt = selectionPromptInput.value.trim() || 'Improve this text';

    selectionResponseTextarea.value = 'Thinking...';
    selectionPromptInput.disabled = true;
    acceptSelectionButton.disabled = true;
    rejectSelectionButton.disabled = true;

    const fullPrompt = `Please improve the following selected text based on the user's request. Return only the improved text without any explanations or additional content:\n\nSelected text: "${currentSelection.text}"\n\nUser request: ${userPrompt}`;

    try {
        const response = await fetch('http://127.0.0.1:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: selectedAiModel,
                prompt: fullPrompt,
                stream: false,
            }),
        });

        if (!response.ok) {
            throw new Error(
                `AI API request failed: ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();
        let suggestion = data.response || '';
        suggestion = suggestion.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        latestSelectionSuggestion = suggestion;
        selectionResponseTextarea.value = suggestion || 'No suggestion.';
    } catch (error) {
        selectionResponseTextarea.value = 'Error: ' + error;
        latestSelectionSuggestion = '';
    } finally {
        selectionPromptInput.disabled = false;
        acceptSelectionButton.disabled = false;
        rejectSelectionButton.disabled = false;
    }
}

let latestSelectionSuggestion = '';

export function initializeSelectionToolbar(): void {
    if (markdownInput) {
        markdownInput.addEventListener('mouseup', () => {
            const selection = getTextareaSelection();
            if (selection) {
                currentSelection = selection;
                positionToolbar(selection);
            } else {
                selectionToolbar.style.display = 'none';
            }
        });

        markdownInput.addEventListener('keyup', (event) => {
            if (event.key.includes('Arrow') || event.key === 'Escape') {
                const selection = getTextareaSelection();
                if (selection) {
                    currentSelection = selection;
                    positionToolbar(selection);
                } else {
                    selectionToolbar.style.display = 'none';
                }
            }
        });

        document.addEventListener('mousedown', (event) => {
            if (
                !selectionToolbar.contains(event.target as Node) &&
                event.target !== markdownInput
            ) {
                selectionToolbar.style.display = 'none';
            }
        });
    }

    if (selectionEditButton && selectionModal && selectedTextPreview) {
        selectionEditButton.addEventListener('click', () => {
            selectedTextPreview.textContent = `Selected text: "${currentSelection.text}"`;
            selectionPromptInput.value = '';
            selectionResponseTextarea.value = '';
            selectionModal.style.display = 'flex';
            selectionPromptInput.focus();
        });
    }

    if (
        selectionModal &&
        selectionPromptInput &&
        selectionResponseTextarea &&
        acceptSelectionButton &&
        rejectSelectionButton &&
        closeSelectionModal
    ) {
        selectionPromptInput.addEventListener('keydown', async (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                await generateSelectionSuggestion();
            }
        });

        selectionPromptInput.addEventListener('blur', async () => {
            if (
                selectionPromptInput.value.trim() &&
                !selectionResponseTextarea.value
            ) {
                await generateSelectionSuggestion();
            }
        });

        closeSelectionModal.onclick = (): void => {
            selectionModal.style.display = 'none';
        };

        rejectSelectionButton.onclick = (): void => {
            selectionModal.style.display = 'none';
        };

        acceptSelectionButton.onclick = async (): Promise<void> => {
            if (latestSelectionSuggestion && markdownInput) {
                const currentValue = markdownInput.value;
                const newValue =
                    currentValue.slice(0, currentSelection.start) +
                    latestSelectionSuggestion +
                    currentValue.slice(currentSelection.end);

                markdownInput.value = newValue;

                const parseResult = marked.parse(newValue);
                if (typeof parseResult === 'string') {
                    if (markdownPreview) {
                        markdownPreview.innerHTML = parseResult;
                        renderMathFormulas();
                    }
                } else {
                    parseResult.then((html) => {
                        if (markdownPreview) {
                            markdownPreview.innerHTML = html;
                            renderMathFormulas();
                        }
                    });
                }

                debouncedAddToHistory(newValue);
                updateWordAndCharacterCount();
                selectionToolbar.style.display = 'none';
                selectionModal.style.display = 'none';
            }
        };

        window.addEventListener('click', (event) => {
            if (event.target === selectionModal) {
                selectionModal.style.display = 'none';
            }
        });
    }

    // Update selected AI model
    if (modelSelectDropdown) {
        selectedAiModel = modelSelectDropdown.value;
        modelSelectDropdown.addEventListener('change', () => {
            selectedAiModel = modelSelectDropdown.value;
        });
    }
}
