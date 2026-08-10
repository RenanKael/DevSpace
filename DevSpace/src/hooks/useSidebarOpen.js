import { useEffect, useState } from "react";

const STORAGE_KEY = "sidebarOpen";

/**
 * Estado de expandido/minimizado da sidebar, persistido entre recarregamentos.
 */
function isMobileViewport() {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches;
}

export function useSidebarOpen() {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (isMobileViewport()) return false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === null) return true;
      return JSON.parse(saved);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (isMobileViewport()) return;
    persistSidebarOpen(sidebarOpen);
  }, [sidebarOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    function onChange(event) {
      if (event.matches) setSidebarOpen(false);
    }
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return [sidebarOpen, setSidebarOpen];
}

/**
 * Grava o estado direto no localStorage, sem passar pelo React state.
 * Necessário quando a navegação troca de página no mesmo clique que
 * deveria reabrir a sidebar: a página atual desmonta antes que seu
 * próprio useEffect consiga persistir o novo valor, então a página
 * seguinte leria o valor antigo ao montar.
 */
export function persistSidebarOpen(value) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // localStorage indisponível (modo privado, quota etc.) — ignora
  }
}
