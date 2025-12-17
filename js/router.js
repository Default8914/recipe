export function getQuery() {
  const params = new URLSearchParams(location.search);
  const obj = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  return obj;
}

export function setQuery(next) {
  const params = new URLSearchParams();
  Object.entries(next).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    params.set(k, String(v));
  });
  const url = `${location.pathname}?${params.toString()}`;
  history.replaceState({}, "", url);
}
