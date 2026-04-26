import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";

export default function Perfil({ onLogout, irHome }) {
  const [usuario, setUsuario] = useState(null);

  // 🔥 pega usuário do localStorage
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuarioLogado"));
    setUsuario(user);
  }, []);

  function logout() {
    localStorage.removeItem("usuarioLogado");
    onLogout();
  }

  // evita quebrar antes de carregar
  if (!usuario) return null;

  return (
    <div className="home">
      <Sidebar onReload={irHome} irPerfil={() => {}} />

      <div className="profile-page">

        {/* CAPA */}
        <div
          className="capa"
          style={{
            backgroundImage: usuario.fotoCapa
              ? `url(${usuario.fotoCapa})`
              : "none",
          }}
        ></div>

        {/* HEADER */}
        <div className="perfil-header">
          <div
            className="foto"
            style={{
              backgroundImage: usuario.fotoPerfil
                ? `url(${usuario.fotoPerfil})`
                : "none",
            }}
          ></div>

          <button className="btn-editar">
            Editar Perfil
          </button>
        </div>

        {/* INFO */}
        <div className="info">
          <h2>{usuario.username}</h2>
          <span>@{usuario.username}</span>

          <p className="data">
            Entrou em{" "}
            {usuario.criadoEm
              ? new Date(usuario.criadoEm).toLocaleDateString()
              : "..."}
          </p>

          <p className="bio">
            {usuario.bio || "Sem bio..."}
          </p>

          <div className="stats">
            <span>Seguindo 0</span>
            <span>Seguidores 0</span>
            <span>Projetos {usuario.projetos?.length || 0}</span>
          </div>
        </div>

        {/* CARD */}
        <div className="bio-card">
          <p>Dev Back End.</p>
          <p>WhatsApp: ...</p>
          <p>Instagram: ...</p>
        </div>

        {/* LOGOUT */}
        <button className="logout" onClick={logout}>
          Sair da conta
        </button>

      </div>
    </div>
  );
}