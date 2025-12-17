import { loadRecipes } from "../api.js";
import { getQuery, setQuery } from "../router.js";
import { recipeCard, wireFavoriteButtons } from "../ui.js";
import { ViewsStore } from "../store.js";

const PAGE_SIZE = 6;

export async function initRecipesPage() {
  const recipes = await loadRecipes();
  const q = getQuery();

  // UI elements
  const elQ = document.getElementById("f-q");
  const elTag = document.getElementById("f-tag");
  const elTimeMax = document.getElementById("f-timeMax");
  const elDiff = document.getElementById("f-difficulty");
  const elSort = document.getElementById("f-sort");
  const btnApply = document.getElementById("apply");
  const btnReset = document.getElementById("reset");

  const grid = document.getElementById("recipes-grid");
  const count = document.getElementById("result-count");
  const empty = document.getElementById("empty");
  const loadMore = document.getElementById("load-more");
  const scrollTop = document.getElementById("scroll-top");

  let page = Number(q.page || "1");
  if (!Number.isFinite(page) || page < 1) page = 1;

  // init controls from URL
  if (elQ) elQ.value = q.q || "";
  if (elTag) elTag.value = q.tag || "";
  if (elTimeMax) elTimeMax.value = q.timeMax || "";
  if (elDiff) elDiff.value = q.difficulty || "";
  if (elSort) elSort.value = q.sort || "popular";

  function applyAndRender({ resetPage = true } = {}) {
    const next = {
      q: elQ?.value.trim() || "",
      tag: elTag?.value || "",
      timeMax: elTimeMax?.value || "",
      difficulty: elDiff?.value || "",
      sort: elSort?.value || "popular",
      page: resetPage ? 1 : page
    };
    if (resetPage) page = 1;
    setQuery(next);
    renderList(recipes, next);
  }

  btnApply?.addEventListener("click", () => applyAndRender({ resetPage: true }));
  btnReset?.addEventListener("click", () => {
    elQ.value = "";
    elTag.value = "";
    elTimeMax.value = "";
    elDiff.value = "";
    elSort.value = "popular";
    applyAndRender({ resetPage: true });
  });

  // Apply on Enter in search input
  elQ?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyAndRender({ resetPage: true });
  });

  scrollTop?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  function renderList(all, params) {
    const filtered = filterAndSort(all, params);
    const total = filtered.length;

    // pagination by "load more"
    const shown = filtered.slice(0, page * PAGE_SIZE);

    if (count) count.textContent = `${total} рецептов • показано ${shown.length}`;
    if (empty) empty.classList.toggle("hidden", total !== 0);

    if (grid) {
      grid.innerHTML = shown.map(r => recipeCard(r)).join("");
      wireFavoriteButtons(grid, () => {
        // re-render only shown subset to update hearts
        grid.innerHTML = shown.map(r => recipeCard(r)).join("");
      });
    }

    if (loadMore) {
      const can = shown.length < total;
      loadMore.disabled = !can;
      loadMore.style.opacity = can ? "1" : ".5";
    }
  }

  loadMore?.addEventListener("click", () => {
    page += 1;
    const params = getQuery();
    setQuery({ ...params, page });
    renderList(recipes, { ...params, page });
  });

  // initial render
  renderList(recipes, { ...q, page });
}

function filterAndSort(all, params) {
  const query = (params.q || "").toLowerCase().trim();
  const tag = params.tag || "";
  const timeMax = params.timeMax ? Number(params.timeMax) : null;
  const difficulty = params.difficulty || "";
  const sort = params.sort || "popular";

  let res = [...all];

  if (query) {
    res = res.filter(r => {
      const hay = `${r.title} ${r.description || ""} ${(r.tags||[]).join(" ")} ${(r.ingredients||[]).map(i=>i.name).join(" ")}`
        .toLowerCase();
      return hay.includes(query);
    });
  }
  if (tag) {
    res = res.filter(r => (r.tags || []).includes(tag));
  }
  if (Number.isFinite(timeMax)) {
    res = res.filter(r => Number(r.time) <= timeMax);
  }
  if (difficulty) {
    res = res.filter(r => r.difficulty === difficulty);
  }

  const views = ViewsStore.getAll();

  res.sort((a,b) => {
    if (sort === "popular") return (views[b.id]||0) - (views[a.id]||0);
    if (sort === "new") return (b.createdAt||"").localeCompare(a.createdAt||"");
    if (sort === "time") return (a.time||0) - (b.time||0);
    if (sort === "title") return (a.title||"").localeCompare(b.title||"", "ru");
    return 0;
  });

  return res;
}
