import { useOverlayClose } from "../hooks/useOverlayClose";

/**
 * Componente reutilizável para overlays/modais
 * Fecha ao clicar no botão X, fora do conteúdo ou ao pressionar ESC
 */
export default function Overlay({ open, onClose, children, className = "" }) {
  useOverlayClose(open, onClose);

  if (!open) return null;

  return (
    <div className={`overlay ${className}`} onClick={onClose}>
      <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
        <button
          className="overlay-close-btn"
          onClick={onClose}
          type="button"
          title="Fechar"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
