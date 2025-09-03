import { themeToggleButton, sunIcon, moonIcon } from "./uiElements";

function updateThemeIcon(): void {
  if (document.body.classList.contains("dark")) {
    sunIcon.style.display = "inline";
    moonIcon.style.display = "none";
  } else {
    sunIcon.style.display = "none";
    moonIcon.style.display = "inline";
  }
}

function setTheme(theme: "dark" | "light"): void {
  document.body.classList.remove("dark", "light");
  document.body.classList.add(theme);
  localStorage.setItem("theme", theme);
  updateThemeIcon();
}

export function initializeTheme(): void {
  themeToggleButton.addEventListener("click", (event) => {
    event.preventDefault();
    const newTheme = document.body.classList.contains("dark")
      ? "light"
      : "dark";
    setTheme(newTheme);
  });

  const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
  const systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;

  const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");

  setTheme(initialTheme);
}
