import { DsIcon } from "./icons";
import { Icons } from "./iconKit";
import MobileNav from "./MobileNav";
import logo from "../assets/IMGS/Black-DevSpace-removebg-preview.png";

function paginaDaRota() {
  const path = typeof window === "undefined" ? "/" : window.location.pathname;
  if (path.startsWith("/explorar")) return "explorar";
  if (path.startsWith("/chat")) return "chat";
  if (path.startsWith("/notificacoes")) return "notificacoes";
  if (path.startsWith("/configuracoes")) return "configuracoes";
  if (path.startsWith("/perfil")) return "perfil";
  return "home";
}

export default function Sidebar({
  isOpen,
  onToggle,
  onReload,
  irPerfil,
  irExplorar,
  onOpenPost,
  irChat,
  logado = true,
  onRequireAuth,
  contactRequests = [],
  unreadConversas = [],
  activityNotifications = [],
  irNotificacoes,
  irConfiguracoes,
}) {
  const totalNotificacoes = contactRequests.length + unreadConversas.length + activityNotifications.length;
  const unreadCount = Array.isArray(unreadConversas) ? unreadConversas.length : 0;
  const paginaAtual = paginaDaRota();

  function protegido(acao, mensagem) {
    if (logado) {
      acao?.();
      return;
    }
    onRequireAuth?.(mensagem);
  }

  return (
    <>
      <a href="#conteudo-principal" className="skip-link">
        Pular para o conteúdo
      </a>

      {!isOpen && (
        <button type="button" className="sidebar-toggle" onClick={onToggle} aria-label="Expandir menu" title="Expandir menu">
          <DsIcon icon={Icons.PanelLeftOpen} size="sidebar" />
        </button>
      )}

      {isOpen && <div className="sidebar-backdrop" onClick={onToggle} aria-hidden="true" />}

      <aside className={`sidebar ${isOpen ? "open" : "closed"}`} aria-label="Navegação principal">
        <div className="sidebar-header">
          <div className="sidebar-brand-row">
            <div className="logo" onClick={onReload} title="Página Inicial" role="button" tabIndex={0}>
              <img src={logo} alt="DevSpace" />
              {!isOpen && (
                <button
                  type="button"
                  className="logo-toggle-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                  }}
                  aria-label="Expandir menu"
                  title="Expandir menu"
                >
                  <DsIcon icon={Icons.PanelLeftOpen} size="sidebar" />
                </button>
              )}
            </div>
            {isOpen && (
              <strong className="sidebar-wordmark" onClick={onReload}>
                DevSpace
              </strong>
            )}
          </div>

          {isOpen && (
            <button
              type="button"
              className="sidebar-toggle-inline"
              onClick={onToggle}
              aria-label="Recolher menu"
              title="Recolher menu"
            >
              <DsIcon icon={Icons.PanelLeftClose} size="sidebar" />
            </button>
          )}
        </div>

        <nav>
          <button
            type="button"
            className={`nav-item${paginaAtual === "home" ? " active" : ""}`}
            data-label="Página Inicial"
            onClick={onReload}
          >
            <span className="nav-icon">
              <DsIcon icon={Icons.Home} size="sidebar" />
            </span>
            <span className="nav-label">Página Inicial</span>
          </button>

          <button
            type="button"
            className={`nav-item${paginaAtual === "explorar" ? " active" : ""}`}
            data-label="Explorar"
            onClick={irExplorar}
          >
            <span className="nav-icon">
              <DsIcon icon={Icons.Search} size="sidebar" />
            </span>
            <span className="nav-label">Explorar</span>
          </button>

          <button
            type="button"
            className={`nav-item${paginaAtual === "perfil" ? " active" : ""}`}
            data-label="Perfil"
            onClick={() => protegido(irPerfil, "Entre para ver e editar seu perfil.")}
          >
            <span className="nav-icon">
              <DsIcon icon={Icons.User} size="sidebar" />
            </span>
            <span className="nav-label">Perfil</span>
          </button>

          <button
            type="button"
            className={`nav-item${paginaAtual === "chat" ? " active" : ""}`}
            data-label="Mensagens"
            onClick={() => protegido(irChat, "Entre para conversar com outras pessoas.")}
          >
            <span className={`nav-icon${unreadCount > 0 ? " nav-icon-badge" : ""}`}>
              <DsIcon icon={Icons.MessageCircle} size="sidebar" />
              {unreadCount > 0 && <i className="nav-unread" aria-hidden="true" />}
            </span>
            <span className="nav-label">Mensagens</span>
          </button>

          <button
            type="button"
            className={`nav-item${paginaAtual === "notificacoes" ? " active" : ""}`}
            data-label="Notificações"
            onClick={() => protegido(irNotificacoes, "Entre para ver suas notificações.")}
          >
            <span className={`nav-icon${totalNotificacoes > 0 ? " nav-icon-badge" : ""}`}>
              <DsIcon icon={Icons.Bell} size="sidebar" />
              {totalNotificacoes > 0 && (
                <i className="nav-unread" aria-hidden="true">
                  {totalNotificacoes > 99 ? "99+" : totalNotificacoes}
                </i>
              )}
            </span>
            <span className="nav-label">Notificações</span>
          </button>

          <button
            type="button"
            className={`nav-item${paginaAtual === "configuracoes" ? " active" : ""}`}
            data-label="Configurações"
            onClick={() => protegido(irConfiguracoes, "Entre para abrir as configurações.")}
          >
            <span className="nav-icon">
              <DsIcon icon={Icons.Settings} size="sidebar" />
            </span>
            <span className="nav-label">Configurações</span>
          </button>
        </nav>

        <button
          type="button"
          className="post-btn"
          data-label="Nova publicação"
          title="Nova publicação"
          aria-label="Nova publicação"
          onClick={() => protegido(onOpenPost, "Entre para publicar no DevSpace.")}
        >
          <span className="post-btn-icon">
            <DsIcon icon={Icons.Plus} size="sidebar" />
          </span>
          <span className="post-btn-label">Postar</span>
        </button>
      </aside>
      <MobileNav
        paginaAtual={paginaAtual}
        onHome={onReload}
        onExplorar={irExplorar}
        onPerfil={irPerfil}
        onChat={irChat}
        onOpenPost={onOpenPost}
        logado={logado}
        onRequireAuth={onRequireAuth}
      />
    </>
  );
}
