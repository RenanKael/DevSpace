import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";

export default function Perfil({ onLogout, irHome }) {
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuarioLogado"));
    setUsuario(user);
  }, []);

  function logout() {
    localStorage.removeItem("usuarioLogado");
    onLogout();
  }

  if (!usuario) return null;

  return (
    <div className="home">
      <Sidebar
        onReload={irHome}
        irPerfil={() => {}}
      />

      <div className="profile-page">

        <div className="capa"></div>

        <div className="perfil-header">
          <div className="foto"></div>
        </div>

        <div className="info">
          <h2>{usuario.username}</h2>
          <span>@{usuario.username}</span>
        </div>

        <button onClick={logout}>
          Sair da conta
        </button>
      </div>
    </div>
  );
}