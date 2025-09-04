export interface Tab {
    id: string;
    title: string;
    path: string | null;
    content: string;
    hasUnsavedChanges: boolean;
    history: string[];
    historyIndex: number;
}
