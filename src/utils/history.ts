import { MAX_HISTORY_LENGTH, DEBOUNCE_DELAY } from '../constants';
import { allTabs, activeTabIndex } from './tabManagement';
import { markdownInput, markdownPreview } from '../components/uiElements';
import { marked } from 'marked';
import { renderMathFormulas } from '../markdown/renderer';
import { updateWordAndCharacterCount } from '../components/statusBar';

export function debounce(
    func: (content: string) => void,
    delay: number
): (content: string) => void {
    let timeoutId: NodeJS.Timeout | undefined;

    return function (content: string) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(content), delay);
    };
}

export function addToHistory(content: string): void {
    if (activeTabIndex < 0) return;

    const currentTab = allTabs[activeTabIndex];
    if (currentTab.historyIndex < currentTab.history.length - 1) {
        currentTab.history = currentTab.history.slice(
            0,
            currentTab.historyIndex + 1
        );
    }

    currentTab.history.push(content);

    if (currentTab.history.length > MAX_HISTORY_LENGTH) {
        currentTab.history.shift();
    } else {
        currentTab.historyIndex = currentTab.history.length - 1;
    }

    updateUndoRedoButtons();
}

export const debouncedAddToHistory = debounce(addToHistory, DEBOUNCE_DELAY);

export function undo(): void {
    if (activeTabIndex < 0) return;

    const currentTab = allTabs[activeTabIndex];

    if (currentTab.historyIndex > 0) {
        currentTab.historyIndex--;
        const previousContent = currentTab.history[currentTab.historyIndex];

        if (markdownInput) {
            markdownInput.value = previousContent;
            currentTab.content = previousContent;
            currentTab.hasUnsavedChanges = true;

            const parseResult = marked.parse(previousContent);
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

            updateWordAndCharacterCount();
            updateUndoRedoButtons();
        }
    }
}

export function redo(): void {
    if (activeTabIndex < 0) return;

    const currentTab = allTabs[activeTabIndex];

    if (currentTab.historyIndex < currentTab.history.length - 1) {
        currentTab.historyIndex++;
        const nextContent = currentTab.history[currentTab.historyIndex];

        if (markdownInput) {
            markdownInput.value = nextContent;
            currentTab.content = nextContent;
            currentTab.hasUnsavedChanges = true;

            const parseResult = marked.parse(nextContent);
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

            updateWordAndCharacterCount();
            updateUndoRedoButtons();
        }
    }
}

export function updateUndoRedoButtons(): void {
    const undoButton = document.getElementById('menu-undo') as HTMLElement;
    const redoButton = document.getElementById('menu-redo') as HTMLElement;

    if (activeTabIndex >= 0) {
        const currentTab = allTabs[activeTabIndex];

        if (currentTab.historyIndex > 0) {
            undoButton.removeAttribute('disabled');
            undoButton.style.opacity = '1';
            undoButton.style.cursor = 'pointer';
        } else {
            undoButton.setAttribute('disabled', 'true');
            undoButton.style.opacity = '0.5';
            undoButton.style.cursor = 'default';
        }

        if (currentTab.historyIndex < currentTab.history.length - 1) {
            redoButton.removeAttribute('disabled');
            redoButton.style.opacity = '1';
            redoButton.style.cursor = 'pointer';
        } else {
            redoButton.setAttribute('disabled', 'true');
            redoButton.style.opacity = '0.5';
            redoButton.style.cursor = 'default';
        }
    } else {
        undoButton.setAttribute('disabled', 'true');
        redoButton.setAttribute('disabled', 'true');
        undoButton.style.opacity = '0.5';
        redoButton.style.opacity = '0.5';
        undoButton.style.cursor = 'default';
        redoButton.style.cursor = 'default';
    }
}
