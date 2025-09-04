import {
    newFile,
    openFile,
    saveFile,
    saveFileAs,
    exportHtml,
    exportPdf,
    exitApp,
} from '../utils/fileOperations';
import { undo, redo } from '../utils/history';
import { openFolderButton } from '../components/uiElements';

export function setupMenuHandlers(): void {
    document.getElementById('menu-new')?.addEventListener('click', newFile);
    document.getElementById('menu-open')?.addEventListener('click', openFile);
    document.getElementById('menu-save')?.addEventListener('click', saveFile);
    document
        .getElementById('menu-save-as')
        ?.addEventListener('click', saveFileAs);
    document
        .getElementById('menu-export-html')
        ?.addEventListener('click', exportHtml);
    document
        .getElementById('menu-export-pdf')
        ?.addEventListener('click', exportPdf);
    document.getElementById('menu-exit')?.addEventListener('click', exitApp);
    document.getElementById('menu-undo')?.addEventListener('click', undo);
    document.getElementById('menu-redo')?.addEventListener('click', redo);
}

let keyboardShortcutsInitialized = false;

function isMacOS(): boolean {
    return /Mac/i.test(navigator.userAgent);
}

export function setupKeyboardShortcuts(): void {
    if (keyboardShortcutsInitialized) return;
    keyboardShortcutsInitialized = true;

    document.addEventListener('keydown', (event) => {
        const cmdOrCtrl = isMacOS() ? event.metaKey : event.ctrlKey;

        if (cmdOrCtrl) {
            switch (event.key.toLowerCase()) {
                case 'n':
                    event.preventDefault();
                    newFile();
                    break;
                case 'o':
                    if (event.shiftKey) {
                        event.preventDefault();
                        if (openFolderButton) openFolderButton.click();
                    } else {
                        event.preventDefault();
                        openFile();
                    }
                    break;
                case 's':
                    event.preventDefault();
                    if (event.shiftKey) {
                        saveFileAs();
                    } else {
                        saveFile();
                    }
                    break;
                case 'e':
                    event.preventDefault();
                    if (event.shiftKey) {
                        exportPdf();
                    } else {
                        exportHtml();
                    }
                    break;
                case 'q':
                    event.preventDefault();
                    exitApp();
                    break;
                case 't':
                    if (event.shiftKey) {
                        event.preventDefault();
                        const themeToggle = document.getElementById(
                            'toggle-theme'
                        ) as HTMLButtonElement;
                        if (themeToggle) themeToggle.click();
                    } else {
                        event.preventDefault();
                        newFile();
                    }
                    break;
            }
        }

        // Undo/Redo shortcuts
        if (cmdOrCtrl) {
            if (event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                undo();
            } else if (
                event.key === 'y' ||
                (event.key === 'z' && event.shiftKey)
            ) {
                event.preventDefault();
                redo();
            }
        }

        // Text formatting shortcuts
        if (cmdOrCtrl) {
            switch (event.key.toLowerCase()) {
                case 'b':
                    event.preventDefault();
                    document.getElementById('toolbar-bold')?.click();
                    break;
                case 'i':
                    if (event.shiftKey) {
                        event.preventDefault();
                        document.getElementById('toolbar-image')?.click();
                    } else {
                        event.preventDefault();
                        document.getElementById('toolbar-italic')?.click();
                    }
                    break;
                case 'h':
                    event.preventDefault();
                    document.getElementById('toolbar-heading')?.click();
                    break;
                case 'l':
                    event.preventDefault();
                    document.getElementById('toolbar-list')?.click();
                    break;
                case '`':
                    event.preventDefault();
                    document.getElementById('toolbar-code')?.click();
                    break;
                case 'q':
                    event.preventDefault();
                    document.getElementById('toolbar-quote')?.click();
                    break;
                case 'k':
                    event.preventDefault();
                    document.getElementById('toolbar-link')?.click();
                    break;
            }
        }

        // Fullscreen preview
        if (event.key === 'F11') {
            event.preventDefault();
            document.getElementById('fullscreen-preview')?.click();
        }
    });
}

export function setupAddTabButton(): void {
    document.getElementById('add-tab')?.addEventListener('click', newFile);
}
