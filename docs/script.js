// Shared script of the HTML docs: light/dark theme toggle (remembered in localStorage) and a
// "Copy" button on every code block. Pages work without it.
(() => {
  const root = document.documentElement;
  const read = () => {
    try {
      return localStorage.getItem("theme");
    } catch {
      return null; // storage blocked (private window, file:// policy): follow the system theme
    }
  };
  const saved = read();
  if (saved) root.dataset.theme = saved;

  const isDark = () =>
    root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;

  const button = document.getElementById("theme");
  const label = () => {
    button.textContent = isDark() ? "☀︎" : "☾";
    button.setAttribute("aria-label", isDark() ? "Light theme" : "Dark theme");
  };
  label();
  button.addEventListener("click", () => {
    root.dataset.theme = isDark() ? "light" : "dark";
    try {
      localStorage.setItem("theme", root.dataset.theme);
    } catch {
      // storage blocked: the choice lasts until the page is closed
    }
    label();
  });

  for (const pre of document.querySelectorAll("pre")) {
    const copy = document.createElement("button");
    copy.className = "copy";
    copy.textContent = "Copy";
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector("code").textContent);
        copy.textContent = "Copied";
      } catch {
        copy.textContent = "Failed";
      }
      setTimeout(() => {
        copy.textContent = "Copy";
      }, 1500);
    });
    pre.append(copy);
  }
})();
