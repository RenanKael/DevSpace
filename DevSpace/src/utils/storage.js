export function readJson(storage, key, fallback = null) {
  try {
    const raw = storage?.getItem?.(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function readSessionUser() {
  return readJson(localStorage, "usuarioLogado") || readJson(sessionStorage, "usuarioLogado");
}
