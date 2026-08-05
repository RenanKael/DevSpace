import { useState } from "react";
import "../style/home.css";
import SidebarToggleIcon from "./SidebarToggleIcon";
import ChatIcon from "./ChatIcon";
import BellIcon from "./BellIcon";
import logo from "../assets/IMGS/Black-DevSpace-removebg-preview.png";
import paginaInicial from "../assets/IMGS/Home.png";
import explorar from "../assets/IMGS/Explorar.png";
import perfil from "../assets/IMGS/PerfilPadrao.png";

function fallbackAvatar(seed) {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed || "usuario")}`;
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
  onAcceptContact,
  onDeclineContact,
  unreadConversas = [],
  onOpenUnreadConversa,
}) {
  const [notifAberta, setNotifAberta] = useState(false);
  const totalNotificacoes = contactRequests.length + unreadConversas.length;

  function protegido(acao, mensagem) {
    if (logado) {
      acao?.();
      return;
    }
    onRequireAuth?.(mensagem);
  }

  return (
    <>
      {!isOpen && (
        <button className="sidebar-toggle" onClick={onToggle} aria-label="Abrir menu">
          <SidebarToggleIcon action="abrir" />
        </button>
      )}

      {isOpen && <div className="sidebar-backdrop" onClick={onToggle} />}

      <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          <div className="logo" onClick={onReload}>
            <img src={logo} alt="DevSpace Logo" />
            {!isOpen && (
              <button
                className="logo-toggle-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                aria-label="Abrir menu"
              >
                <SidebarToggleIcon action="abrir" size={28} />
              </button>
            )}
          </div>

          {isOpen && (
            <button className="sidebar-toggle-inline" onClick={onToggle} aria-label="Minimizar menu">
              <SidebarToggleIcon action="fechar" />
            </button>
          )}
        </div>

        <nav>
          <div className="nav-item" data-label="Página Inicial" onClick={onReload}>
            <img src={paginaInicial} alt="" />
            <span>Página Inicial</span>
          </div>

          <div className="nav-item" data-label="Explorar" onClick={irExplorar}>
            <img src={explorar} alt="" />
            <span>Explorar</span>
          </div>

          <div
            className="nav-item"
            data-label="Perfil"
            onClick={() => protegido(irPerfil, "Entre para ver e editar seu perfil.")}
          >
            <img src={perfil} alt="" />
            <span>Perfil</span>
          </div>

          <div
            className="nav-item"
            data-label="Chat"
            onClick={() => protegido(irChat, "Entre para conversar com outras pessoas.")}
          >
            <ChatIcon />
            <span>Chat</span>
          </div>

          {logado && (
            <div className="nav-item sidebar-notif-wrapper" data-label="Notificações">
              <button
                type="button"
                className="sidebar-notif-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setNotifAberta((aberta) => !aberta);
                }}
                aria-label="Notificações"
              >
                <span className="sidebar-notif-icon-wrap">
                  <BellIcon />
                  {totalNotificacoes > 0 && (
                    <span className="sidebar-notif-badge">
                      {totalNotificacoes > 99 ? "99+" : totalNotificacoes}
                    </span>
                  )}
                </span>
                <span>Notificações</span>
              </button>

              {notifAberta && (
                <>
                  <div
                    className="sidebar-backdrop"
                    style={{ background: "transparent" }}
                    onClick={() => setNotifAberta(false)}
                  />
                  <div className="sidebar-notif-panel" onClick={(e) => e.stopPropagation()}>
                    <h4>Solicitações de contato</h4>
                    {contactRequests.length === 0 && (
                      <p className="sidebar-notif-empty">Nenhuma solicitação pendente.</p>
                    )}
                    {contactRequests.map((req) => (
                      <div key={req.id} className="sidebar-notif-item">
                        <div
                          className="sidebar-notif-avatar"
                          style={{
                            backgroundImage: `url(${req.remetente.fotoPerfil || fallbackAvatar(req.remetente.handle)})`,
                          }}
                        />
                        <div className="sidebar-notif-info">
                          <strong>{req.remetente.username}</strong>
                          <span>quer te contatar</span>
                          <div className="sidebar-notif-actions">
                            <button
                              type="button"
                              className="sidebar-notif-aceitar"
                              onClick={() => {
                                onAcceptContact?.(req.id);
                                setNotifAberta(false);
                              }}
                            >
                              Aceitar
                            </button>
                            <button
                              type="button"
                              className="sidebar-notif-recusar"
                              onClick={() => onDeclineContact?.(req.id)}
                            >
                              Recusar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <h4>Mensagens</h4>
                    {unreadConversas.length === 0 && (
                      <p className="sidebar-notif-empty">Nenhuma mensagem nova.</p>
                    )}
                    {unreadConversas.map((conv) => (
                      <button
                        type="button"
                        key={conv.conversaId}
                        className="sidebar-notif-item sidebar-notif-item-btn"
                        onClick={() => {
                          onOpenUnreadConversa?.(conv.conversaId, conv.outroParticipante);
                          setNotifAberta(false);
                        }}
                      >
                        <div
                          className="sidebar-notif-avatar"
                          style={{
                            backgroundImage: `url(${conv.outroParticipante.fotoPerfil || fallbackAvatar(conv.outroParticipante.handle)})`,
                          }}
                        />
                        <div className="sidebar-notif-info">
                          <strong>{conv.outroParticipante.username}</strong>
                          <span>
                            {conv.naoLidas} mensage{conv.naoLidas === 1 ? "m" : "ns"} nova
                            {conv.naoLidas === 1 ? "" : "s"}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </nav>

        <button
          className="post-btn"
          data-label="Postar"
          onClick={() => protegido(onOpenPost, "Entre para publicar no DevSpace.")}
        >
          Postar
        </button>
      </div>
    </>
  );
}
