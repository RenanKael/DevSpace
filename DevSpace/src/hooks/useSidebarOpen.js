import { useEffect, useState } from "react";

const STORAGE_KEY = "sidebarOpen";

/**
 * Estado de expandido/minimizado da sidebar, persistido entre recarregamentos.
 */
export function useSidebarOpen() {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === null ? true : JSON.parse(saved);
    } catch {
      return true;
    }
  });

  useEffect(() => {
    persistSidebarOpen(sidebarOpen);
  }, [sidebarOpen]);

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
