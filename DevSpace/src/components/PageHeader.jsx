import { DsIcon } from "./icons";
import { Icons } from "./iconKit";

export default function PageHeader({ eyebrow, title, description, backLabel, onBack }) {
  return (
    <header className={`page-hero${onBack ? " page-hero--with-back" : ""}`}>
      {onBack && (
        <button type="button" className="ds-back-btn" onClick={onBack} title={backLabel || "Voltar"} aria-label={backLabel || "Voltar"}>
          <DsIcon icon={Icons.ArrowLeft} size="action" />
        </button>
      )}
      <div>
        {eyebrow ? <span>{eyebrow}</span> : null}
        {title ? <h2>{title}</h2> : null}
        {description ? <p>{description}</p> : null}
      </div>
    </header>
  );
}
