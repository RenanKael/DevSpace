import { useEffect } from "react";

/**
 * Hook reutilizável para fechar overlays/modais com ESC e clique fora
 * @param {boolean} isOpen - Se o overlay está aberto
 * @param {function} onClose - Callback para fechar
 */
export function useOverlayClose(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);
}
