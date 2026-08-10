const LABELS = ["", "Avaliar com 1 estrela", "Avaliar com 2 estrelas", "Avaliar com 3 estrelas", "Avaliar com 4 estrelas", "Avaliar com 5 estrelas"];

export default function StarRating({
  media = 0,
  count = 0,
  minhaNota = 0,
  interactive = false,
  hoverValue = 0,
  onHoverChange,
  onRate,
  disabled = false,
}) {
  const mediaTxt = Number(media || 0).toFixed(1).replace(".", ",");
  const interactiveDisplay = hoverValue || minhaNota || 0;
  const countLabel = count > 0
    ? `${count} ${count === 1 ? "avaliação" : "avaliações"}`
    : "Nenhuma avaliação";

  return (
    <div className={`ds-rating-block${interactive ? " is-interactive" : " is-compact"}`}>
      <div className="ds-rating-inline" role="img" aria-label={`Média ${mediaTxt} em 5`}>
        <span className="star ativa" aria-hidden="true">★</span>
        <strong className="ds-rating-score">{mediaTxt}</strong>
        <span className="ds-rating-count">· {countLabel}</span>
      </div>

      {interactive && (
        <>
          <strong className="ds-rating-yours">Avalie este perfil</strong>
          <div
            className="ds-rating-row"
            role="group"
            aria-label="Avaliar este perfil"
            onMouseLeave={() => onHoverChange?.(0)}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={n <= interactiveDisplay ? "active" : ""}
                title={LABELS[n]}
                aria-label={LABELS[n]}
                disabled={disabled}
                onMouseEnter={() => onHoverChange?.(n)}
                onFocus={() => onHoverChange?.(n)}
                onBlur={() => onHoverChange?.(0)}
                onClick={() => onRate?.(n)}
              >
                ★
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
