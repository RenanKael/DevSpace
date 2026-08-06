import { useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";
import "../style/notificacoes.css";
import backArrow from "../assets/IMGS/DawnFlech (2).png";
import { updateUser as updateUserRequest } from "../api";
import { useSidebarOpen } from "../hooks/useSidebarOpen";

function fallbackAvatar(seed) {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed || "usuario")}`;
}

function getUsuarioLogadoDoStorage() {
  try {
    return JSON.parse(localStorage.getItem("usuarioLogado")) || JSON.parse(sessionStorage.getItem("usuarioLogado"));
  } catch {
    return null;
  }
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
  const [secaoAtiva, setSecaoAtiva] = useState("perfil");

  const [usuarioLogado, setUsuarioLogado] = useState(getUsuarioLogadoDoStorage);
  const [form, setForm] = useState(() => getUsuarioLogadoDoStorage() || {});
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function salvarConfiguracoesPerfil(e) {
    e.preventDefault();
    setErro("");
    setSucesso("");

    if (!usuarioLogado) {
      setErro("Não foi possível identificar sua conta.");
      return;
    }

    if (!form.username || !form.handle) {
      setErro("Nome e @ são obrigatórios!");
      return;
    }

    const querAlterarSenha = senhaAtual || novaSenha || confirmarSenha;

    if (querAlterarSenha) {
      if (!senhaAtual || !novaSenha || !confirmarSenha) {
        setErro("Preencha a senha atual, a nova senha e a confirmação.");
        return;
      }
      // Contas antigas (local-only, sem id de backend) guardam a senha em
      // texto puro no proprio objeto; contas reais tem a senha verificada
      // pelo servidor (com hash), ao chamar updateUserRequest.
      if (!usuarioLogado.id && senhaAtual !== usuarioLogado.senha) {
        setErro("Senha atual incorreta.");
        return;
      }
      if (novaSenha.length < 6) {
        setErro("A nova senha precisa ter pelo menos 6 caracteres.");
        return;
      }
      if (novaSenha !== confirmarSenha) {
        setErro("A confirmação da nova senha não bate.");
        return;
      }
    }

    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const handleJaExiste = usuarios.find(
      (u) => u.handle === form.handle.toLowerCase() && u.email !== usuarioLogado.email
    );
    if (handleJaExiste) {
      setErro("Este @ já está em uso!");
      return;
    }

    let atualizado = {
      ...usuarioLogado,
      username: form.username,
      handle: form.handle.toLowerCase(),
      bio: form.bio || "",
      disponivelContratacao: !!form.disponivelContratacao,
      senha: querAlterarSenha ? novaSenha : usuarioLogado.senha,
    };

    if (usuarioLogado.id) {
      try {
        const payload = {
          username: form.username,
          handle: form.handle.toLowerCase(),
          bio: form.bio || "",
          disponivelContratacao: atualizado.disponivelContratacao,
        };
        if (querAlterarSenha) {
          payload.senha = novaSenha;
          payload.senhaAtual = senhaAtual;
        }
        const backendUser = await updateUserRequest(usuarioLogado.id, payload);
        atualizado = { ...atualizado, ...backendUser, senha: atualizado.senha };
      } catch (error) {
        setErro(error.message || "Erro ao salvar perfil no servidor.");
        return;
      }
    }

    usuarios = usuarios.map((u) => (u.email === usuarioLogado.email ? atualizado : u));
    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    if (localStorage.getItem("usuarioLogado")) {
      localStorage.setItem("usuarioLogado", JSON.stringify(atualizado));
    }
    if (sessionStorage.getItem("usuarioLogado")) {
      sessionStorage.setItem("usuarioLogado", JSON.stringify(atualizado));
    }

    setUsuarioLogado(atualizado);
    setForm(atualizado);
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmarSenha("");
    setSucesso("Perfil atualizado com sucesso!");
  }

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

        <div className="config-layout">
          <nav className="config-nav">
            <button
              type="button"
              className={`config-nav-item${secaoAtiva === "perfil" ? " active" : ""}`}
              onClick={() => setSecaoAtiva("perfil")}
            >
              Editar perfil
            </button>
            <button
              type="button"
              className={`config-nav-item${secaoAtiva === "bloqueados" ? " active" : ""}`}
              onClick={() => setSecaoAtiva("bloqueados")}
            >
              Perfis bloqueados
            </button>
          </nav>

          <div className="config-content">
          {secaoAtiva === "perfil" && usuarioLogado && (
            <div className="notif-section">
              <h4>Editar perfil</h4>
              <p className="notif-config-hint">
                Essas informações ficam visíveis para qualquer pessoa que veja seu perfil.
              </p>

              <form onSubmit={salvarConfiguracoesPerfil}>
                <div className="config-field">
                  <label htmlFor="config-nome">Nome</label>
                  <input
                    id="config-nome"
                    value={form.username || ""}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>

                <div className="config-field">
                  <label htmlFor="config-handle">@usuário</label>
                  <input
                    id="config-handle"
                    value={form.handle || ""}
                    onChange={(e) => setForm({ ...form, handle: e.target.value.replace(/\s+/g, "") })}
                  />
                </div>

                <div className="config-field">
                  <label htmlFor="config-bio">Bio</label>
                  <input
                    id="config-bio"
                    value={form.bio || ""}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                  />
                </div>

                <label className="notif-toggle">
                  <input
                    type="checkbox"
                    checked={!!form.disponivelContratacao}
                    onChange={(e) => setForm({ ...form, disponivelContratacao: e.target.checked })}
                  />
                  <span className="notif-toggle-track" aria-hidden="true" />
                  <span className="notif-toggle-label">Disponível para ser contratado</span>
                </label>

                <h4 className="config-subsection">Alterar senha</h4>

                <div className="config-field">
                  <label htmlFor="config-senha-atual">Senha atual</label>
                  <input
                    id="config-senha-atual"
                    type="password"
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    placeholder="Deixe em branco para não alterar"
                  />
                </div>

                <div className="config-field">
                  <label htmlFor="config-senha-nova">Nova senha</label>
                  <input
                    id="config-senha-nova"
                    type="password"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                  />
                </div>

                <div className="config-field">
                  <label htmlFor="config-senha-confirmar">Confirmar nova senha</label>
                  <input
                    id="config-senha-confirmar"
                    type="password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                  />
                </div>

                {erro && <p className="erro">{erro}</p>}
                {sucesso && <p className="sucesso">{sucesso}</p>}

                <button type="submit" className="notif-aceitar config-row-salvar">
                  Salvar
                </button>
              </form>
            </div>
          )}

          {secaoAtiva === "bloqueados" && (
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
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
