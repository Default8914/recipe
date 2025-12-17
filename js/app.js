import { renderHeader, renderFooter } from "./ui.js";
import { initTheme } from "./ui.js";

export function boot() {
  renderHeader();
  renderFooter();
  initTheme();
}
