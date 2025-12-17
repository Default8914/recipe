let cache = null;

export async function loadRecipes() {
  if (cache) return cache;
  const res = await fetch("./data/recipes.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Не удалось загрузить recipes.json");
  const data = await res.json();
  cache = data;
  return data;
}

export async function getRecipeById(id) {
  const recipes = await loadRecipes();
  return recipes.find(r => r.id === id) || null;
}
