import { DsIcon } from "./icons";
import { Icons } from "./iconKit";

export default function MobileNav({
  paginaAtual = "home",
  onHome,
  onExplorar,
  onPerfil,
  onChat,
  onOpenPost,
  logado = false,
  onRequireAuth,
}) {
  function protegido(acao, mensagem) {
    if (logado) {
      acao?.();
      return;
    }
    onRequireAuth?.(mensagem);
  }

  return (
    <nav className="ds-mobile-nav" aria-label="Navegação inferior">
      <button type="button" className={paginaAtual === "home" ? "active" : ""} onClick={onHome}>
        <DsIcon icon={Icons.Home} size="action" />
        Início
      </button>
      <button type="button" className={paginaAtual === "explorar" ? "active" : ""} onClick={onExplorar}>
        <DsIcon icon={Icons.Search} size="action" />
        Explorar
      </button>
      <button
        type="button"
        className="ds-mobile-post"
        onClick={() => protegido(onOpenPost, "Entre para publicar no DevSpace.")}
      >
        <DsIcon icon={Icons.Plus} size="action" />
        Postar
      </button>
      <button
        type="button"
        className={paginaAtual === "chat" ? "active" : ""}
        onClick={() => protegido(onChat, "Entre para conversar.")}
      >
        <DsIcon icon={Icons.MessageCircle} size="action" />
        Chat
      </button>
      <button
        type="button"
        className={paginaAtual === "perfil" ? "active" : ""}
        onClick={() => protegido(onPerfil, "Entre para ver seu perfil.")}
      >
        <DsIcon icon={Icons.User} size="action" />
        Perfil
      </button>
    </nav>
  );
}
