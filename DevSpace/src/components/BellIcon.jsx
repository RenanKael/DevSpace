export default function BellIcon({ size = 24, count = 0 }) {
  const temNotificacao = count > 0;
  const texto = count > 99 ? "99+" : String(count);

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Notificacao desenhada dentro do proprio SVG (coordenadas fixas do
          icone), pra nunca depender de posicionamento CSS externo. */}
      {temNotificacao && (
        <>
          <circle cx="18.5" cy="5.5" r={texto.length > 2 ? "6" : "5"} fill="#ef4444" />
          <text
            x="18.5"
            y="5.7"
            fill="#fff"
            fontSize={texto.length > 2 ? "5" : "6.5"}
            fontWeight="700"
            fontFamily="Arial, Helvetica, sans-serif"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {texto}
          </text>
        </>
      )}
    </svg>
  );
}
