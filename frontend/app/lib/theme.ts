import type { AppSettings } from "@/app/types";

export function applyBrandColors(cfg: Partial<AppSettings>) {
  const r = document.documentElement;
  if (cfg.primaryColor) r.style.setProperty("--primary", cfg.primaryColor);
  if (cfg.accentColor) r.style.setProperty("--accent", cfg.accentColor);
}

export function applyDarkMode(dark: boolean) {
  const r = document.documentElement;
  if (dark) {
    r.style.setProperty("--ink",               "#dce8e1");
    r.style.setProperty("--muted",             "#7a9589");
    r.style.setProperty("--line",              "#243328");
    r.style.setProperty("--canvas",            "#0f1a14");
    r.style.setProperty("--paper",             "#172118");
    r.style.setProperty("--pale-green",        "#1a2d1e");
    r.style.setProperty("--th-bg",             "#1a2820");
    r.style.setProperty("--td-color",          "#c0d4c8");
    r.style.setProperty("--hover-bg",          "#1e2e24");
    r.style.setProperty("--input-bg",          "#1e2e24");
    r.style.setProperty("--topbar-bg",         "rgba(15,26,20,.92)");
    r.style.setProperty("--panel-border",      "#243328");
    r.style.setProperty("--modal-close-color", "#9fb8ac");
  } else {
    [
      "--ink", "--muted", "--line", "--canvas", "--paper", "--pale-green",
      "--th-bg", "--td-color", "--hover-bg", "--input-bg", "--topbar-bg",
      "--panel-border", "--modal-close-color",
    ].forEach(v => r.style.removeProperty(v));
  }
}
