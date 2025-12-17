import { loadRecipes } from "../api.js";
import { recipeCard, wireFavoriteButtons } from "../ui.js";
import { ViewsStore } from "../store.js";

export async function initHomePage() {
  const featuredEl = document.getElementById("home-featured");
  const popularEl = document.getElementById("home-popular");
  const quickEl = document.getElementById("home-quick");
  const form = document.getElementById("home-search");

  const recipes = await loadRecipes();

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = new FormData(form).get("q")?.toString().trim() || "";
      location.href = `recipes.html?q=${encodeURIComponent(q)}`;
    });
  }

  // Featured: 2 новых
  const newest = [...recipes].sort((a,b) => (b.createdAt||"").localeCompare(a.createdAt||"")).slice(0, 2);
  if (featuredEl) {
    featuredEl.innerHTML = newest.map(r => `
      <a class="card pad-16" href="recipe.html?id=${encodeURIComponent(r.id)}">
        <div class="row" style="justify-content:space-between; gap:12px; align-items:flex-start;">
          <div>
            <div style="font-weight:800">${r.title}</div>
            <div class="muted small">${r.description || ""}</div>
          </div>
          <div class="badge">⏱ ${r.time} мин</div>
        </div>
      </a>
    `).join("");
  }

  // Popular by views (fallback: first)
  const views = ViewsStore.getAll();
  const popular = [...recipes].sort((a,b) => (views[b.id]||0) - (views[a.id]||0)).slice(0, 6);

  if (popularEl) {
    popularEl.innerHTML = popular.map(r => recipeCard(r)).join("");
    wireFavoriteButtons(popularEl, () => {
      // re-render to update icons
      popularEl.innerHTML = popular.map(r => recipeCard(r)).join("");
    });
  }

  // Quick <= 20
  const quick = recipes.filter(r => r.time <= 20).slice(0, 6);
  if (quickEl) {
    quickEl.innerHTML = quick.map(r => recipeCard(r)).join("");
    wireFavoriteButtons(quickEl, () => {
      quickEl.innerHTML = quick.map(r => recipeCard(r)).join("");
    });
  }
}
