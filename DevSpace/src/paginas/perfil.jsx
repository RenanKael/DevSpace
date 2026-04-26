import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";

export default function Perfil({ onLogout, irHome }) {
  const [usuario, setUsuario] = useState(null);
  const [editando, setEditando] = useState(false);

  const [form, setForm] = useState({});
  const [senhaAtual, setSenhaAtual] = useState("");

  // posição das imagens
  const [posPerfil, setPosPerfil] = useState({ x: 50, y: 50 });
  const [posCapa, setPosCapa] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuarioLogado"));

    if (user) {
      if (!user.criadoEm) {
        user.criadoEm = new Date().toISOString();
      }

      setUsuario(user);
      setForm(user);

      setPosPerfil(user.posPerfil || { x: 50, y: 50 });
      setPosCapa(user.posCapa || { x: 50, y: 50 });
    }
  }, []);

  function handleImagem(e, tipo) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setForm((prev) => ({
        ...prev,
        [tipo]: reader.result,
      }));
    };

    reader.readAsDataURL(file);
  }

  function salvar() {
    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    if (
      (form.email !== usuario.email || form.senha !== usuario.senha) &&
      senhaAtual !== usuario.senha
    ) {
      alert("Senha atual incorreta!");
      return;
    }

    const atualizado = {
      ...form,
      posPerfil,
      posCapa,
    };

    usuarios = usuarios.map((u) =>
      u.email === usuario.email ? atualizado : u
    );

    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("usuarioLogado", JSON.stringify(atualizado));

    setUsuario(atualizado);
    setEditando(false);
  }

  function logout() {
    localStorage.removeItem("usuarioLogado");
    onLogout();
  }

  if (!usuario) return null;

  return (
    <div className="home">
      <Sidebar onReload={irHome} irPerfil={() => {}} />

      <div className="profile-page">

        {/* CAPA */}
        <div
          className="capa"
          style={{
            backgroundImage: `url(${usuario.fotoCapa || ""})`,
            backgroundPosition: `${posCapa.x}% ${posCapa.y}%`,
          }}
        ></div>

        {/* HEADER */}
        <div className="perfil-header">
          <div
            className="foto"
            style={{
              backgroundImage: `url(${usuario.fotoPerfil || ""})`,
              backgroundPosition: `${posPerfil.x}% ${posPerfil.y}%`,
            }}
          ></div>

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
      </div>

      {/* POPUP */}
      {editando && (
        <div className="overlay">
          <div className="popup">

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

            {/* FOTO PERFIL */}
            <label>Foto de Perfil</label>

            <div className="preview-perfil-box">
              {form.fotoPerfil && (
                <div
                  className="preview-perfil"
                  style={{
                    backgroundImage: `url(${form.fotoPerfil})`,
                    backgroundPosition: `${posPerfil.x}% ${posPerfil.y}%`,
                  }}
                ></div>
              )}
            </div>

            <button onClick={() => document.getElementById("perfilInput").click()}>
              Alterar Foto
            </button>

            <input
              id="perfilInput"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleImagem(e, "fotoPerfil")}
            />

            {/* CONTROLES PERFIL */}
            <div className="controle">
              <span>Vertical</span>
              <input
                type="range"
                min="0"
                max="100"
                value={posPerfil.y}
                onChange={(e) =>
                  setPosPerfil({ ...posPerfil, y: e.target.value })
                }
              />
              <span>Horizontal</span>
              <input
                type="range"
                min="0"
                max="100"
                value={posPerfil.x}
                onChange={(e) =>
                  setPosPerfil({ ...posPerfil, x: e.target.value })
                }
              />
            </div>

            {/* CAPA */}
            <label>Foto de Capa</label>

            <div className="preview-capa-box">
              {form.fotoCapa && (
                <div
                  className="preview-capa"
                  style={{
                    backgroundImage: `url(${form.fotoCapa})`,
                    backgroundPosition: `${posCapa.x}% ${posCapa.y}%`,
                  }}
                ></div>
              )}
            </div>

            <button onClick={() => document.getElementById("capaInput").click()}>
              Alterar Capa
            </button>

            <input
              id="capaInput"
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleImagem(e, "fotoCapa")}
            />

            {/* CONTROLES CAPA */}
            <div className="controle">
              <span>Vertical</span>
              <input
                type="range"
                min="0"
                max="100"
                value={posCapa.y}
                onChange={(e) =>
                  setPosCapa({ ...posCapa, y: e.target.value })
                }
              />
              <span>Horizontal</span>
              <input
                type="range"
                min="0"
                max="100"
                value={posCapa.x}
                onChange={(e) =>
                  setPosCapa({ ...posCapa, x: e.target.value })
                }
              />
            </div>

            <input
              placeholder="Novo email"
              value={form.email || ""}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />

            <input
              type="password"
              placeholder="Nova senha"
              onChange={(e) =>
                setForm({ ...form, senha: e.target.value })
              }
            />

            <input
              type="password"
              placeholder="Senha atual"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
            />

            <div className="popup-btns">
              <button onClick={salvar}>Salvar</button>
              <button onClick={() => setEditando(false)}>
                Cancelar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}