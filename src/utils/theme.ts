export function Theme_apply(theme: "dark" | "light"): void {
  if (theme === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
}
