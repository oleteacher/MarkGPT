import { themeToggleButton, sunIcon, moonIcon } from "./uiElements";

function updateThemeIcon(): void {
  // Add comprehensive null checks
  if (!sunIcon || !moonIcon) {
    console.error("Icons not found:", { sunIcon, moonIcon });
    return;
  }

  const isDarkMode = document.body.classList.contains("dark");
  console.log("Current theme:", isDarkMode ? "dark" : "light");

  if (isDarkMode) {
    // Show sun icon (to switch to light mode)
    sunIcon.style.display = "inline";
    moonIcon.style.display = "none";
  } else {
    // Show moon icon (to switch to dark mode)
    sunIcon.style.display = "none";
    moonIcon.style.display = "inline";
  }
}

function setTheme(theme: "dark" | "light"): void {
  console.log("Setting theme to:", theme);

  // Clean slate approach - remove both classes first
  document.body.classList.remove("dark", "light");

  // Add the desired theme
  document.body.classList.add(theme);

  // Save to localStorage
  localStorage.setItem("theme", theme);

  // Update icons
  updateThemeIcon();
}

export function initializeTheme(): void {
  console.log("Initializing theme...");

  // Check if button exists
  if (!themeToggleButton) {
    console.error("Theme toggle button not found");
    return;
  }

  // Set up click handler
  themeToggleButton.addEventListener("click", (event) => {
    console.log("Theme button clicked");
    event.preventDefault(); // Prevent any default behavior

    const currentTheme = document.body.classList.contains("dark")
      ? "dark"
      : "light";
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    console.log("Switching from", currentTheme, "to", newTheme);
    setTheme(newTheme);
  });

  // Initialize theme from localStorage or system preference
  const savedTheme = localStorage.getItem("theme") as "dark" | "light" | null;
  const systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;
  const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");

  console.log("Initial theme:", initialTheme, {
    savedTheme,
    systemPrefersDark,
  });
  setTheme(initialTheme);
}

// Ensure DOM is ready before initializing
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeTheme);
} else {
  // DOM is already ready
  initializeTheme();
}
