import { themeToggleButton, sunIcon, moonIcon } from "./uiElements";

function updateThemeIcon(): void {
  const isDarkMode = document.body.classList.contains("dark");

  if (isDarkMode) {
    sunIcon.style.display = "inline";
    moonIcon.style.display = "none";
  } else {
    sunIcon.style.display = "none";
    moonIcon.style.display = "inline";
  }
}

export function initializeTheme(): void {
  if (themeToggleButton) {
    themeToggleButton.addEventListener("click", () => {
      document.body.classList.toggle("dark");
      document.body.classList.toggle("light");

      const newTheme = document.body.classList.contains("dark")
        ? "dark"
        : "light";
      localStorage.setItem("theme", newTheme);

      updateThemeIcon();
    });

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.add("light");
    }

    updateThemeIcon();
  }
}
