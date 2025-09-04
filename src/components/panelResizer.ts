import { MIN_PANEL_WIDTH } from '../constants';

export function setupPanelResizing(): void {
    const container = document.querySelector('.container') as HTMLElement;
    const resizers = document.querySelectorAll(
        '.resizer:not(.internal-resizer)'
    ) as NodeListOf<HTMLElement>;
    const internalResizer = document.getElementById(
        'resizer-internal'
    ) as HTMLElement;

    let isCurrentlyResizing = false;
    let startMouseX: number;

    resizers.forEach((resizer, resizerIndex) => {
        resizer.addEventListener('mousedown', (event: MouseEvent) => {
            isCurrentlyResizing = true;
            resizer.classList.add('active');
            startMouseX = event.clientX;

            function handleMouseMove(moveEvent: MouseEvent): void {
                if (!isCurrentlyResizing) return;

                const deltaX = moveEvent.clientX - startMouseX;
                const containerWidth = container.offsetWidth;
                const currentColumns =
                    getComputedStyle(container).gridTemplateColumns.split(' ');

                if (resizerIndex === 0) {
                    const currentLeftWidth = parseFloat(currentColumns[0]);
                    const currentChatWidth = parseFloat(currentColumns[4]);

                    let newLeftWidth = currentLeftWidth + deltaX;
                    const maxLeftWidth =
                        containerWidth - MIN_PANEL_WIDTH - MIN_PANEL_WIDTH - 12;
                    newLeftWidth = Math.max(
                        MIN_PANEL_WIDTH,
                        Math.min(maxLeftWidth, newLeftWidth)
                    );

                    let newMiddleWidth =
                        containerWidth - newLeftWidth - currentChatWidth - 12;
                    if (newMiddleWidth < MIN_PANEL_WIDTH) {
                        newMiddleWidth = MIN_PANEL_WIDTH;
                        newLeftWidth =
                            containerWidth -
                            newMiddleWidth -
                            currentChatWidth -
                            12;
                        if (newLeftWidth < MIN_PANEL_WIDTH) {
                            newLeftWidth = MIN_PANEL_WIDTH;
                            newMiddleWidth =
                                containerWidth -
                                newLeftWidth -
                                currentChatWidth -
                                12;
                        }
                    }

                    const finalMiddleWidth = newMiddleWidth;

                    container.style.gridTemplateColumns = `${newLeftWidth}px 6px ${finalMiddleWidth}px 6px ${currentChatWidth}px`;
                } else if (resizerIndex === 1) {
                    const currentLeftWidth = parseFloat(currentColumns[0]);
                    const currentChatWidth = parseFloat(currentColumns[4]);

                    let newChatWidth = currentChatWidth - deltaX;
                    const maxChatWidth =
                        containerWidth - MIN_PANEL_WIDTH - MIN_PANEL_WIDTH - 12;
                    newChatWidth = Math.max(
                        MIN_PANEL_WIDTH,
                        Math.min(maxChatWidth, newChatWidth)
                    );

                    let newMiddleWidth =
                        containerWidth - currentLeftWidth - newChatWidth - 12;
                    if (newMiddleWidth < MIN_PANEL_WIDTH) {
                        newMiddleWidth = MIN_PANEL_WIDTH;
                        newChatWidth =
                            containerWidth -
                            currentLeftWidth -
                            newMiddleWidth -
                            12;
                        if (newChatWidth < MIN_PANEL_WIDTH) {
                            newChatWidth = MIN_PANEL_WIDTH;
                            newMiddleWidth =
                                containerWidth -
                                currentLeftWidth -
                                newChatWidth -
                                12;
                        }
                    }

                    const finalMiddleWidth = newMiddleWidth;

                    container.style.gridTemplateColumns = `${currentLeftWidth}px 6px ${finalMiddleWidth}px 6px ${newChatWidth}px`;
                }

                startMouseX = moveEvent.clientX;
            }

            function handleMouseUp(): void {
                isCurrentlyResizing = false;
                resizer.classList.remove('active');
                document.body.style.cursor = '';
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            }

            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            event.preventDefault(); // Prevent text selection
        });
    });

    if (internalResizer) {
        internalResizer.addEventListener('mousedown', (event: MouseEvent) => {
            isCurrentlyResizing = true;
            internalResizer.classList.add('active');
            startMouseX = event.clientX;

            const editorPreviewContainer = document.querySelector(
                '.editor-preview-container'
            ) as HTMLElement;
            const editorPanel = document.querySelector(
                '.panel-markdown'
            ) as HTMLElement;
            const previewPanel = document.querySelector(
                '.panel-preview'
            ) as HTMLElement;

            function handleMouseMove(moveEvent: MouseEvent): void {
                if (!isCurrentlyResizing || !editorPreviewContainer) return;

                const deltaX = moveEvent.clientX - startMouseX;
                const containerRect =
                    editorPreviewContainer.getBoundingClientRect();

                const currentEditorWidth = editorPanel.offsetWidth;

                let newEditorWidth = currentEditorWidth + deltaX;
                const maxEditorWidth =
                    containerRect.width - MIN_PANEL_WIDTH - 6; // 6px for resizer

                newEditorWidth = Math.max(
                    MIN_PANEL_WIDTH,
                    Math.min(maxEditorWidth, newEditorWidth)
                );

                editorPanel.style.flexBasis = `${newEditorWidth}px`;
                previewPanel.style.flexBasis = `${containerRect.width - newEditorWidth - 6}px`; // 6px for resizer

                startMouseX = moveEvent.clientX;
            }

            function handleMouseUp(): void {
                isCurrentlyResizing = false;
                internalResizer.classList.remove('active');
                document.body.style.cursor = '';
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            }

            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            event.preventDefault(); // Prevent text selection
        });
    }
}
