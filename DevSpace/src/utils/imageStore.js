const DB_NAME = "devspace-chat-images";
const DB_VERSION = 1;
const STORE_NAME = "images";

/**
 * Armazena as imagens do chat no IndexedDB em vez do localStorage.
 * O localStorage tem uma cota minuscula (poucos MB) e estourava com
 * facilidade guardando imagens em base64; o IndexedDB aceita centenas de
 * MB, entao imagens deixam de disputar espaco com o resto do site e
 * nunca mais precisam ser apagadas do historico para abrir espaco.
 */
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function gerarIdImagem() {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function salvarImagem(id, dataUrl) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(dataUrl, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function carregarImagem(id) {
  if (!id) return "";
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => resolve(req.result || "");
      req.onerror = () => reject(req.error);
    });
  } catch {
    return "";
  }
}
