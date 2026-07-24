export type Theme = "light" | "dark";

const KEY = "notely.theme";

export function getTheme(): Theme {
  return "light";
}

export function applyTheme() {
  document.documentElement.dataset.theme = "light";
  localStorage.setItem(KEY, "light");
}

export function toggleTheme(): Theme {
  return "light";
}