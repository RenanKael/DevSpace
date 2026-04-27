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

      if (tipo === "fotoPerfil") setEditandoPerfilImg(true);
      if (tipo === "fotoCapa") setEditandoCapaImg(true);
    };

    reader.readAsDataURL(file);
  }

  function salvar() {
    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    if (
      (form.email !== usuario.email || form.senha !== usuario.senha) &&
      senhaAtual !== usuario.senha
    ) {
      setErro("Senha atual incorreta!");
      setSucesso("");
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

    setErro("");
    setSucesso("Salvo com sucesso!");
    setTimeout(() => setSucesso(""), 2500);
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

        <div
          className="capa"
          style={{
            backgroundImage: `url(${usuario.fotoCapa || ""})`,
            backgroundPosition: `${posCapa.x}% ${posCapa.y}%`,
          }}
        ></div>

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

      {/* POPUP PRINCIPAL */}
      {editando && (
        <div className="overlay">
          <div className="popup">

            <button className="close-btn" onClick={() => setEditando(false)}>
              ✕
            </button>

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

            <label>Foto de Perfil</label>
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

            <label>Foto de Capa</label>
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

            {erro && <p className="erro">{erro}</p>}
            {sucesso && <p className="sucesso">{sucesso}</p>}

            <div className="popup-btns">
              <button onClick={salvar}>Salvar</button>
            </div>

          </div>
        </div>
      )}

      {/* AJUSTE FOTO PERFIL */}
      {editandoPerfilImg && (
        <div className="overlay">
          <div className="popup small">

            <h2>Ajustar Foto</h2>

            <div className="preview-perfil-box">
              <div
                className="preview-perfil"
                style={{
                  backgroundImage: `url(${form.fotoPerfil})`,
                  backgroundPosition: `${posPerfil.x}% ${posPerfil.y}%`,
                }}
              ></div>
            </div>

            <label>Vertical</label>
            <input type="range" min="0" max="100"
              value={posPerfil.y}
              onChange={(e) =>
                setPosPerfil({ ...posPerfil, y: e.target.value })
              }
            />

            <label>Horizontal</label>
            <input type="range" min="0" max="100"
              value={posPerfil.x}
              onChange={(e) =>
                setPosPerfil({ ...posPerfil, x: e.target.value })
              }
            />

            <button onClick={() => setEditandoPerfilImg(false)}>
              Confirmar
            </button>

          </div>
        </div>
      )}

      {/* AJUSTE CAPA */}
      {editandoCapaImg && (
        <div className="overlay">
          <div className="popup small">

            <h2>Ajustar Capa</h2>

            <div className="preview-capa-box">
              <div
                className="preview-capa"
                style={{
                  backgroundImage: `url(${form.fotoCapa})`,
                  backgroundPosition: `${posCapa.x}% ${posCapa.y}%`,
                }}
              ></div>
            </div>

            <label>Vertical</label>
            <input type="range" min="0" max="100"
              value={posCapa.y}
              onChange={(e) =>
                setPosCapa({ ...posCapa, y: e.target.value })
              }
            />

            <label>Horizontal</label>
            <input type="range" min="0" max="100"
              value={posCapa.x}
              onChange={(e) =>
                setPosCapa({ ...posCapa, x: e.target.value })
              }
            />

            <button onClick={() => setEditandoCapaImg(false)}>
              Confirmar
            </button>

          </div>
        </div>
      )}
    </div>
  );
}