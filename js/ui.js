import { FavoritesStore, ThemeStore } from "./store.js";

export function renderHeader() {
  const el = document.getElementById("site-header");
  if (!el) return;

  el.innerHTML = `
    <div class="sitebar">
      <div class="sitebar__inner">
        <a class="brand" href="index.html" aria-label="На главную">
          <span class="brand__logo"></span>
          <span>TastyPages</span>
        </a>

        <nav class="nav" aria-label="Навигация">
          <a href="recipes.html">Рецепты</a>
          <a href="favorites.html">Избранное</a>
          <a href="shopping.html">Покупки</a>
          <a href="about.html">О проекте</a>
          <a href="contact.html">Контакты</a>
        </nav>

        <div class="row gap-8">
          <button class="btn" id="theme-toggle" type="button" aria-label="Переключить тему">🌗 Тема</button>
        </div>
      </div>
    </div>
  `;
}

export function renderFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;

  const year = new Date().getFullYear();
  el.innerHTML = `
    <div class="footer">
      <div>© ${year} TastyPages</div>
      <div class="muted">HTML • CSS • JS • localStorage</div>
    </div>
  `;
}

export function toast(message, ms = 1800) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = message;
  document.body.appendChild(t);
  window.setTimeout(() => t.remove(), ms);
}

/* Theme */
export function initTheme() {
  const saved = ThemeStore.get(); // "dark" | "light"
  document.documentElement.setAttribute("data-theme", saved);

  const btn = document.getElementById("theme-toggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    ThemeStore.set(next);
    toast(next === "dark" ? "Тёмная тема" : "Светлая тема");
  });
}

/* Recipe card */
export function recipeCard(recipe, { onToggleFavorite } = {}) {
  const isFav = FavoritesStore.has(recipe.id);
  const tags = (recipe.tags || []).slice(0, 3).map(t => `<span class="badge">#${escapeHtml(t)}</span>`).join("");

  return `
  <article class="card rcard">
    <a href="recipe.html?id=${encodeURIComponent(recipe.id)}" class="rcard__img" aria-label="Открыть рецепт">
      <img src="${escapeAttr(recipe.image)}" alt="${escapeAttr(recipe.title)}" loading="lazy">
    </a>

    <div class="rcard__body">
      <h3 class="rcard__title">${escapeHtml(recipe.title)}</h3>
      <div class="meta">
        <span class="badge">⏱ ${recipe.time} мин</span>
        <span class="badge">⚡ ${escapeHtml(recipe.difficulty)}</span>
        ${tags}
      </div>

      <div class="actions">
        <a class="btn btn--primary" href="recipe.html?id=${encodeURIComponent(recipe.id)}">Открыть</a>
        <button class="iconbtn ${isFav ? "is-active" : ""}" data-fav="${escapeAttr(recipe.id)}" type="button" aria-label="В избранное">
          ${isFav ? "❤️" : "🤍"}
        </button>
      </div>
    </div>
  </article>
  `;
}

export function wireFavoriteButtons(container, onChange) {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-fav]");
    if (!btn) return;
    const id = btn.getAttribute("data-fav");
    FavoritesStore.toggle(id);
    if (onChange) onChange(id);
  });
}

/* helpers */
export function formatAmount(n) {
  if (typeof n !== "number") return "";
  const rounded = Math.round((n + Number.EPSILON) * 100) / 100;
  return String(rounded).replace(".", ",");
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll("\n", " ");
}
