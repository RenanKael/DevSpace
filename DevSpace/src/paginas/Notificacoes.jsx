import Sidebar from "../components/Sidebar";
import "../style/perfil.css";
import "../style/notificacoes.css";
import { useSidebarOpen } from "../hooks/useSidebarOpen";
import PageHeader from "../components/PageHeader";

function fallbackAvatar(seed) {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed || "usuario")}`;
}

const TEXTO_ATIVIDADE = {
  curtida_post: "curtiu seu post",
  comentario_post: "comentou no seu post",
  curtida_comentario: "curtiu seu comentário",
  mencao: "te mencionou em um post",
  seguidor: "começou a te seguir",
  mensagem: "enviou uma mensagem",
  avaliacao: "avaliou seu perfil",
};

const NOTIF_PREF_LABELS = {
  contatos: "Solicitações de contato",
  mensagens: "Mensagens",
  atividade: "Atividade (curtidas, comentários e menções)",
};

export default function Notificacoes({
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
  notifPrefs = { contatos: true, mensagens: true, atividade: true },
  onUpdateNotifPref,
  irConfiguracoes,
}) {
  const [sidebarOpen, setSidebarOpen] = useSidebarOpen();

  const totalNotificacoes =
    contactRequests.length + unreadConversas.length + activityNotifications.length;

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
        irNotificacoes={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        irConfiguracoes={irConfiguracoes}
      />

      <div id="conteudo-principal" className={`profile-page${sidebarOpen ? "" : " sidebar-closed"}`}>
        <PageHeader eyebrow="Inbox" title="Notificações" description="Solicitações, mensagens e atividade da comunidade." />

        <div className="notificacoes-layout">
          <div className="notificacoes-page">
          {totalNotificacoes === 0 && (
            <div className="notif-page-empty">
              <strong>Tudo em dia</strong>
              <p>Nenhuma notificação por aqui no momento.</p>
              <button type="button" className="perfil-empty-cta" onClick={irExplorar}>
                Explorar comunidade
              </button>
            </div>
          )}

          {contactRequests.length > 0 && (
            <div className="notif-section">
              <h4>Solicitações de contato</h4>
              {contactRequests.map((req) => (
                <div key={req.id} className="notif-row">
                  <div
                    className="notif-row-avatar"
                    style={{
                      backgroundImage: `url(${req.remetente.fotoPerfil || fallbackAvatar(req.remetente.handle)})`,
                    }}
                  />
                  <div className="notif-row-info">
                    <strong>{req.remetente.username}</strong>
                    <span>quer te contatar</span>
                    <div className="notif-row-actions">
                      <button
                        type="button"
                        className="notif-aceitar"
                        onClick={() => onAcceptContact?.(req.id)}
                      >
                        Aceitar
                      </button>
                      <button
                        type="button"
                        className="notif-recusar"
                        onClick={() => onDeclineContact?.(req.id)}
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {unreadConversas.length > 0 && (
            <div className="notif-section">
              <h4>Mensagens</h4>
              {unreadConversas.map((conv) => (
                <button
                  type="button"
                  key={conv.conversaId}
                  className="notif-row"
                  onClick={() => onOpenUnreadConversa?.(conv.conversaId, conv.outroParticipante)}
                >
                  <div
                    className="notif-row-avatar"
                    style={{
                      backgroundImage: `url(${conv.outroParticipante.fotoPerfil || fallbackAvatar(conv.outroParticipante.handle)})`,
                    }}
                  />
                  <div className="notif-row-info">
                    <strong>{conv.outroParticipante.username}</strong>
                    <span>
                      {conv.naoLidas === 1 ? "1 mensagem nova" : `${conv.naoLidas} mensagens novas`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {activityNotifications.length > 0 && (
            <div className="notif-section">
              <h4>Atividade</h4>
              {activityNotifications.map((notificacao) => (
                <button
                  type="button"
                  key={notificacao.id}
                  className="notif-row"
                  onClick={() => onOpenActivityNotification?.(notificacao)}
                >
                  <div
                    className="notif-row-avatar"
                    style={{
                      backgroundImage: `url(${notificacao.ator.fotoPerfil || fallbackAvatar(notificacao.ator.handle)})`,
                    }}
                  />
                  <div className="notif-row-info">
                    <strong>{notificacao.ator.username}</strong>
                    <span>{TEXTO_ATIVIDADE[notificacao.tipo] || "interagiu com você"}</span>
                    {notificacao.trecho && (
                      <span className="notif-row-trecho">"{notificacao.trecho}"</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="notificacoes-config">
          <h4>Preferências</h4>
          <p className="notif-config-hint">Escolha quais notificações você quer ver.</p>
          {Object.entries(NOTIF_PREF_LABELS).map(([tipo, label]) => (
            <label key={tipo} className="notif-toggle">
              <input
                type="checkbox"
                checked={!!notifPrefs[tipo]}
                onChange={(e) => onUpdateNotifPref?.(tipo, e.target.checked)}
              />
              <span className="notif-toggle-track" aria-hidden="true" />
              <span className="notif-toggle-label">{label}</span>
            </label>
          ))}
        </aside>
        </div>
      </div>
    </div>
  );
}
