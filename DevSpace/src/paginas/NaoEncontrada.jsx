import Sidebar from "../components/Sidebar";
import { useSidebarOpen } from "../hooks/useSidebarOpen";
import "../style/perfil.css";
import "../style/notificacoes.css";

export default function NaoEncontrada({
  irHome,
  irPerfil,
  irExplorar,
  irChat,
  onOpenPost,
  logado,
  onRequireAuth,
  irNotificacoes,
  irConfiguracoes,
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
        irNotificacoes={irNotificacoes}
        irConfiguracoes={irConfiguracoes}
      />
      <main id="conteudo-principal" className={`profile-page${sidebarOpen ? "" : " sidebar-closed"}`}>
        <div className="page-hero page-hero--with-back">
          <div>
            <span>404</span>
            <h2>Página não encontrada</h2>
            <p>Esse endereço não existe no DevSpace. Volte ao início ou explore a comunidade.</p>
          </div>
        </div>
        <div className="notif-page-empty" style={{ margin: "0 20px 40px" }}>
          <strong>Nada por aqui</strong>
          <p>Confira o link ou escolha um destino abaixo.</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button type="button" className="perfil-empty-cta" onClick={irHome}>
              Ir para o início
            </button>
            <button type="button" className="perfil-empty-cta" onClick={irExplorar}>
              Explorar
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
