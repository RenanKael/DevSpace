export default function SidebarToggleIcon({ action, size = 24 }) {
  const abrindo = action === "abrir";

  return (
    <svg viewBox="0 0 28 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <rect x="3" y="3" width="6" height="18" rx="3" />
      {abrindo ? (
        <>
          <rect x="10" y="10.5" width="7" height="3" rx="1.5" />
          <path d="M15 5.5 L23.5 12 L15 18.5 L15 14 L11 14 L11 10 L15 10 Z" />
        </>
      ) : (
        <>
          <rect x="15" y="10.5" width="7" height="3" rx="1.5" />
          <path d="M17 5.5 L8.5 12 L17 18.5 L17 14 L21 14 L21 10 L17 10 Z" />
        </>
      )}
    </svg>
  );
}
