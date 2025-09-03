import { Tab } from "../types";
import {
  tabsContainer,
  markdownInput,
  markdownPreview,
  statusMsg,
} from "../components/uiElements";
import { marked } from "marked";
import { renderMathFormulas } from "../markdown/renderer";
import { updateWordAndCharacterCount } from "../components/statusBar";
import { updateUndoRedoButtons } from "./history";

export const allTabs: Tab[] = [];
export let activeTabIndex = -1;
let untitledFileCounter = 1;

function createUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function refreshTabsDisplay(): void {
  if (!tabsContainer) return;

  tabsContainer.innerHTML = "";

  allTabs.forEach((tab, index) => {
    const tabElement = document.createElement("div");
    const isActiveTab = index === activeTabIndex;

    tabElement.className = "tab" + (isActiveTab ? " active" : "");
    tabElement.dataset.index = String(index);

    tabElement.innerHTML = `
      <span class="tab-title">${tab.title}</span>
      ${tab.hasUnsavedChanges ? '<span class="unsaved">*</span>' : ""}
      <span class="close" title="Close tab">&times;</span>
    `;

    tabElement.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains("close")) {
        switchToTab(index);
      }
    });

    const closeButton = tabElement.querySelector(".close") as HTMLElement;
    closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      closeTab(index);
    });

    tabsContainer.appendChild(tabElement);
  });
}

export function createNewTab(
  filePath: string | null = null,
  content = "",
  title?: string,
  makeActive = true,
): Tab {
  const newId = createUniqueId();

  let displayTitle: string;
  if (title) {
    displayTitle = title;
  } else if (filePath) {
    displayTitle = filePath.split("/").pop() || filePath;
  } else {
    displayTitle = `Untitled ${untitledFileCounter++}`;
  }

  const newTab: Tab = {
    id: newId,
    title: displayTitle,
    path: filePath,
    content: content,
    hasUnsavedChanges: false,
    history: [content],
    historyIndex: 0,
  };

  allTabs.push(newTab);

  if (makeActive) {
    activeTabIndex = allTabs.length - 1;
    showTabContent(newTab);
  }

  refreshTabsDisplay();
  return newTab;
}

export async function showTabContent(tab: Tab) {
  if (!markdownInput || !markdownPreview) return;

  markdownInput.value = tab.content;

  const parseResult = marked.parse(tab.content || "");
  if (typeof parseResult === "string") {
    markdownPreview.innerHTML = parseResult;
  } else {
    markdownPreview.innerHTML = await parseResult;
  }

  renderMathFormulas();
  updateWordAndCharacterCount();
  updateUndoRedoButtons();

  if (statusMsg) {
    statusMsg.textContent = tab.path ? tab.path : "Unsaved file";
  }
}

export function switchToTab(index: number): void {
  if (index < 0 || index >= allTabs.length) return;

  activeTabIndex = index;
  showTabContent(allTabs[index]);
  refreshTabsDisplay();
}

export async function closeTab(index: number): Promise<void> {
  if (index < 0 || index >= allTabs.length) return;

  const tab = allTabs[index];
  if (tab.hasUnsavedChanges) {
    const userConfirmed = confirm(
      `Tab "${tab.title}" has unsaved changes. Close anyway?`,
    );
    if (!userConfirmed) return;
  }

  allTabs.splice(index, 1);

  if (allTabs.length === 0) {
    createNewTab(null, "");
  } else {
    if (activeTabIndex >= allTabs.length) {
      activeTabIndex = allTabs.length - 1;
    }
    showTabContent(allTabs[activeTabIndex]);
  }

  refreshTabsDisplay();
}

export function isFileAlreadyOpen(filePath: string): boolean {
  return allTabs.some((tab) => tab.path === filePath);
}

export function getCurrentTab(): Tab | null {
  if (activeTabIndex >= 0 && activeTabIndex < allTabs.length) {
    return allTabs[activeTabIndex];
  }
  return null;
}

export function updateCurrentTabContent(content: string): void {
  const currentTab = getCurrentTab();
  if (currentTab) {
    currentTab.content = content;
    currentTab.hasUnsavedChanges = true;
    refreshTabsDisplay();
  }
}

export function markCurrentTabAsSaved(): void {
  const currentTab = getCurrentTab();
  if (currentTab) {
    currentTab.hasUnsavedChanges = false;
    refreshTabsDisplay();
  }
}
