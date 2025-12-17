import { ShoppingStore } from "../store.js";
import { toast, formatAmount } from "../ui.js";

export function initShoppingPage() {
  const listEl = document.getElementById("shopping-list");
  const empty = document.getElementById("shop-empty");

  const btnCopy = document.getElementById("copy");
  const btnClearBought = document.getElementById("clearBought");
  const btnClearAll = document.getElementById("clearAll");

  function render() {
    const items = ShoppingStore.getAll();

    if (empty) empty.classList.toggle("hidden", items.length !== 0);
    if (!listEl) return;

    if (items.length === 0) {
      listEl.innerHTML = "";
      return;
    }

    listEl.innerHTML = `
      <div class="stack gap-12">
        ${items.map(it => `
          <label class="ing" style="margin:0;">
            <div class="ing__left">
              <input type="checkbox" ${it.checked ? "checked" : ""} data-check="${it.id}" />
              <div>
                <div class="ing__name" style="${it.checked ? "text-decoration:line-through; opacity:.7" : ""}">
                  ${escapeHtml(it.name)}
                </div>
                <div class="ing__amt">${renderAmt(it)}</div>
              </div>
            </div>
            <span class="badge">${it.checked ? "✓" : ""}</span>
          </label>
        `).join("")}
      </div>
    `;
  }

  listEl?.addEventListener("change", (e) => {
    const cb = e.target.closest("[data-check]");
    if (!cb) return;
    const id = cb.getAttribute("data-check");
    ShoppingStore.toggleChecked(id);
    render();
  });

  btnClearBought?.addEventListener("click", () => {
    ShoppingStore.removeBought();
    render();
    toast("Купленное удалено");
  });

  btnClearAll?.addEventListener("click", () => {
    ShoppingStore.clear();
    render();
    toast("Список очищен");
  });

  btnCopy?.addEventListener("click", async () => {
    const items = ShoppingStore.getAll();
    if (items.length === 0) {
      toast("Список пуст");
      return;
    }
    const text = items
      .filter(x => !x.checked)
      .map(x => `- ${x.name}${renderAmtPlain(x)}`)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      toast("Скопировано в буфер");
    } catch {
      toast("Не удалось скопировать");
    }
  });

  render();
}

function renderAmt(it) {
  if (it.amount === null || it.amount === undefined) return `<span class="muted small">по вкусу</span>`;
  const a = typeof it.amount === "number" ? formatAmount(it.amount) : String(it.amount);
  const u = it.unit ? ` ${escapeHtml(it.unit)}` : "";
  return `<span class="muted small">${a}${u}</span>`;
}
function renderAmtPlain(it) {
  if (it.amount === null || it.amount === undefined) return "";
  const a = typeof it.amount === "number" ? formatAmount(it.amount) : String(it.amount);
  const u = it.unit ? ` ${it.unit}` : "";
  return ` — ${a}${u}`;
}
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
