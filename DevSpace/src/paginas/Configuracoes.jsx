import Sidebar from "../components/Sidebar";
import "../style/perfil.css";
import "../style/notificacoes.css";
import backArrow from "../assets/IMGS/DawnFlech (2).png";
import { useSidebarOpen } from "../hooks/useSidebarOpen";

function fallbackAvatar(seed) {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed || "usuario")}`;
}

export default function Configuracoes({
  irHome,
  irPerfil,
  irExplorar,
  irChat,
  onOpenPost,
  logado,
  onRequireAuth,
  contactRequests = [],
  onAcceptContact,
  onDeclineContact,
  unreadConversas = [],
  onOpenUnreadConversa,
  activityNotifications = [],
  onOpenActivityNotification,
  irNotificacoes,
  blockedUsers = [],
  onUnblockUser,
}) {
  const [sidebarOpen, setSidebarOpen] = useSidebarOpen();

  return (
    <div className="home">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        onReload={irHome}
        irPerfil={irPerfil}
        irExplorar={irExplorar}
        irChat={irChat}
        onOpenPost={onOpenPost}
        logado={logado}
        onRequireAuth={onRequireAuth}
        contactRequests={contactRequests}
        onAcceptContact={onAcceptContact}
        onDeclineContact={onDeclineContact}
        unreadConversas={unreadConversas}
        onOpenUnreadConversa={onOpenUnreadConversa}
        activityNotifications={activityNotifications}
        onOpenActivityNotification={onOpenActivityNotification}
        irNotificacoes={irNotificacoes}
      />

      <div className={`profile-page${sidebarOpen ? "" : " sidebar-closed"}`}>
        <div className="topo-perfil collection-top">
          <button className="back-arrow-btn" onClick={irHome} type="button" title="Voltar">
            <img src={backArrow} alt="Voltar" />
          </button>
          <h3>Configurações</h3>
        </div>

        <div className="notificacoes-page">
          <div className="notif-section">
            <h4>Perfis bloqueados</h4>
            {blockedUsers.length === 0 && (
              <p className="notif-section-empty">Você não bloqueou nenhum perfil.</p>
            )}
            {blockedUsers.map((user) => (
              <div key={user.id} className="notif-row">
                <div
                  className="notif-row-avatar"
                  style={{
                    backgroundImage: `url(${user.fotoPerfil || fallbackAvatar(user.handle)})`,
                  }}
                />
                <div className="notif-row-info">
                  <strong>{user.username}</strong>
                  <span>@{user.handle}</span>
                </div>
                <button
                  type="button"
                  className="notif-recusar"
                  onClick={() => onUnblockUser?.(user.id)}
                >
                  Desbloquear
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
