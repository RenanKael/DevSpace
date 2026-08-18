import { useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";
import "../style/notificacoes.css";
import { updateUser as updateUserRequest } from "../api";
import { useSidebarOpen } from "../hooks/useSidebarOpen";
import PageHeader from "../components/PageHeader";
import ProfileForm from "../components/ProfileForm";
import { placeholderAvatarUri, usableFotoPerfil } from "../utils/avatar";

function fallbackAvatar(seed) {
  return placeholderAvatarUri(seed || "usuario");
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
  irConfiguracoes,
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
  const [salvando, setSalvando] = useState(false);
  const [mostrarSenhas, setMostrarSenhas] = useState(false);

  async function salvarConfiguracoesPerfil(e) {
    e.preventDefault();
    if (salvando) return;
    setErro("");
    setSucesso("");
    setSalvando(true);

    if (!usuarioLogado) {
      setErro("Não foi possível identificar sua conta.");
      setSalvando(false);
      return;
    }

    if (!form.username || !form.handle) {
      setErro("Nome e @ são obrigatórios!");
      setSalvando(false);
      return;
    }

    const querAlterarSenha = senhaAtual || novaSenha || confirmarSenha;

    if (querAlterarSenha) {
      if (!senhaAtual || !novaSenha || !confirmarSenha) {
        setErro("Preencha a senha atual, a nova senha e a confirmação.");
        setSalvando(false);
        return;
      }
      // Contas antigas (local-only, sem id de backend) guardam a senha em
      // texto puro no proprio objeto; contas reais tem a senha verificada
      // pelo servidor (com hash), ao chamar updateUserRequest.
      if (!usuarioLogado.id && senhaAtual !== usuarioLogado.senha) {
        setErro("Senha atual incorreta.");
        setSalvando(false);
        return;
      }
      if (novaSenha.length < 6) {
        setErro("A nova senha precisa ter pelo menos 6 caracteres.");
        setSalvando(false);
        return;
      }
      if (novaSenha !== confirmarSenha) {
        setErro("A confirmação da nova senha não bate.");
        setSalvando(false);
        return;
      }
    }

    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const handleJaExiste = usuarios.find(
      (u) => u.handle === form.handle.toLowerCase() && u.email !== usuarioLogado.email
    );
    if (handleJaExiste) {
      setErro("Este @ já está em uso!");
      setSalvando(false);
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
        setSalvando(false);
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
    setSalvando(false);
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
        irConfiguracoes={irConfiguracoes}
      />

      <div id="conteudo-principal" className={`profile-page${sidebarOpen ? "" : " sidebar-closed"}`}>
        <PageHeader eyebrow="Conta" title="Configurações" description="Gerencie seu perfil e sua conta." />

        <div className="config-layout">
          <nav className="config-nav">
            <button
              type="button"
              className={`config-nav-item${secaoAtiva === "perfil" ? " active" : ""}`}
              onClick={() => setSecaoAtiva("perfil")}
            >
              Perfil
            </button>
            <button
              type="button"
              className={`config-nav-item${secaoAtiva === "seguranca" ? " active" : ""}`}
              onClick={() => setSecaoAtiva("seguranca")}
            >
              Segurança
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
              <h4>Perfil</h4>
              <p className="notif-config-hint">
                Essas informações ficam visíveis para qualquer pessoa que veja seu perfil.
              </p>
              <ProfileForm
                form={form}
                setForm={setForm}
                onSubmit={salvarConfiguracoesPerfil}
                erro={erro}
                sucesso={sucesso}
                salvando={salvando}
                submitLabel="Salvar alterações"
              />
            </div>
          )}

          {secaoAtiva === "seguranca" && usuarioLogado && (
            <div className="notif-section">
              <h4>Segurança</h4>
              <p className="notif-config-hint">Altere sua senha. Informe a senha atual para confirmar.</p>
              <ProfileForm
                form={form}
                setForm={setForm}
                onSubmit={salvarConfiguracoesPerfil}
                erro={erro}
                sucesso={sucesso}
                salvando={salvando}
                showPassword
                passwordOnly
                senhaAtual={senhaAtual}
                setSenhaAtual={setSenhaAtual}
                novaSenha={novaSenha}
                setNovaSenha={setNovaSenha}
                confirmarSenha={confirmarSenha}
                setConfirmarSenha={setConfirmarSenha}
                mostrarSenhas={mostrarSenhas}
                setMostrarSenhas={setMostrarSenhas}
                submitLabel="Alterar senha"
              />
            </div>
          )}

          {secaoAtiva === "bloqueados" && (
            <div className="notif-section">
              <h4>Perfis bloqueados</h4>
              {blockedUsers.length === 0 && (
                <div className="notif-page-empty">
                  <strong>Você ainda não bloqueou nenhum perfil.</strong>
                  <p>Quando bloquear alguém, o perfil aparece aqui para desbloquear depois.</p>
                </div>
              )}
              {blockedUsers.map((user) => (
                <div key={user.id} className="notif-row">
                  <div
                    className="notif-row-avatar"
                    style={{
                      backgroundImage: `url("${usableFotoPerfil(user.fotoPerfil) || fallbackAvatar(user.handle)}")`,
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
