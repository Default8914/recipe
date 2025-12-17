import { loadRecipes } from "../api.js";
import { FavoritesStore } from "../store.js";
import { recipeCard, wireFavoriteButtons } from "../ui.js";

export async function initFavoritesPage() {
  const grid = document.getElementById("favorites-grid");
  const empty = document.getElementById("fav-empty");

  const all = await loadRecipes();

  function render() {
    const favIds = FavoritesStore.getAll();
    const favs = favIds.map(id => all.find(r => r.id === id)).filter(Boolean);

    if (empty) empty.classList.toggle("hidden", favs.length !== 0);

    if (grid) {
      grid.innerHTML = favs.map(r => recipeCard(r)).join("");
      wireFavoriteButtons(grid, () => render());
    }
  }

  render();
}
