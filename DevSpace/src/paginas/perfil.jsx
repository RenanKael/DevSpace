import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";

export default function Perfil({ onLogout, irHome }) {
  const [usuario, setUsuario] = useState(null);
  const [editando, setEditando] = useState(false);

  const [editandoPerfilImg, setEditandoPerfilImg] = useState(false);
  const [editandoCapaImg, setEditandoCapaImg] = useState(false);

  const [form, setForm] = useState({});
  const [senhaAtual, setSenhaAtual] = useState("");

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [posPerfil, setPosPerfil] = useState({ x: 50, y: 50 });
  const [posCapa, setPosCapa] = useState({ x: 50, y: 50 });

  const [avaliacao, setAvaliacao] = useState(0);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuarioLogado"));

    if (user) {
      if (!user.criadoEm) {
        user.criadoEm = new Date().toISOString();
      }

      setUsuario(user);
      setForm(user);
      setAvaliacao(user.avaliacao || 0);

      setPosPerfil(user.posPerfil || { x: 50, y: 50 });
      setPosCapa(user.posCapa || { x: 50, y: 50 });
    }
  }, []);

  function logout() {
    localStorage.removeItem("usuarioLogado");
    onLogout();
  }

  if (!usuario) return null;

  return (
    <div className="home">
      <Sidebar onReload={irHome} irPerfil={() => {}} />

      <div className="profile-page">

        {/* TOPO */}
        <div className="topo-perfil">
          <span className="voltar" onClick={irHome}>←</span>
          <h3>{usuario.username}</h3>

          <div className="avaliacao-topo">
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={n <= avaliacao ? "star ativa" : "star"}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        {/* CAPA */}
        <div
          className="capa"
          style={{
            backgroundImage: `url(${usuario.fotoCapa || ""})`,
            backgroundPosition: `${posCapa.x}% ${posCapa.y}%`,
          }}
        ></div>

        {/* PERFIL */}
        <div className="perfil-header">
          <div
            className="foto"
            style={{
              backgroundImage: `url(${usuario.fotoPerfil || ""})`,
              backgroundPosition: `${posPerfil.x}% ${posPerfil.y}%`,
            }}
          ></div>

          <div className="stats-linha">
            <span><b>0</b> Seguindo</span>
            <span><b>0</b> Seguidores</span>
            <span><b>{usuario.projetos?.length || 0}</b> Projetos</span>
          </div>

          <button className="btn-editar" onClick={() => setEditando(true)}>
            Editar Perfil
          </button>
        </div>

        {/* INFO */}
        <div className="info">
          <h2>{usuario.username}</h2>
          <span>@{usuario.username}</span>

          <p className="data">
            Entrou em {new Date(usuario.criadoEm).toLocaleDateString("pt-BR")}
          </p>

          <p className="bio">{usuario.bio || "Sem bio..."}</p>
        </div>

        <button className="logout" onClick={logout}>
          Sair da conta
        </button>

        {/* 🔥 EDITAR PERFIL (RESTAURADO) */}
        {editando && (
          <div className="overlay">
            <div className="popup">
              <button className="close-btn" onClick={() => setEditando(false)}>✕</button>
              <h2>Editar Perfil</h2>

              <input
                placeholder="Nome"
                value={form.username || ""}
                onChange={(e) =>
                  setForm({ ...form, username: e.target.value })
                }
              />

              <input
                placeholder="Bio"
                value={form.bio || ""}
                onChange={(e) =>
                  setForm({ ...form, bio: e.target.value })
                }
              />

              <div className="popup-btns">
                <button onClick={() => setEditando(false)}>Salvar</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}