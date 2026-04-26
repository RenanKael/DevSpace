import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";

export default function Perfil({ onLogout, irHome }) {
  const [usuario, setUsuario] = useState(null);
  const [editando, setEditando] = useState(false);

  const [form, setForm] = useState({});
  const [senhaAtual, setSenhaAtual] = useState("");

  const [ajuste, setAjuste] = useState(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (user) {
      setUsuario(user);
      setForm(user);
    }
  }, []);

  function handleImagem(e, tipo) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setAjuste({ tipo, src: reader.result });
      setPos({ x: 50, y: 50 });
    };
    reader.readAsDataURL(file);
  }

  function aplicarImagem() {
    setForm((prev) => ({
      ...prev,
      [ajuste.tipo]: ajuste.src,
      [`${ajuste.tipo}Pos`]: pos
    }));
    setAjuste(null);
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

    usuarios = usuarios.map((u) =>
      u.email === usuario.email ? { ...u, ...form } : u
    );

    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("usuarioLogado", JSON.stringify(form));

    setUsuario(form);
    setEditando(false);
  }

  function logout() {
    localStorage.removeItem("usuarioLogado");
    onLogout();
  }

  if (!usuario) return null;

  return (
    <div className="home">
      <Sidebar onReload={irHome} />

      <div className="profile-page">

        {/* CAPA */}
        <div
          className="capa"
          style={{
            backgroundImage: usuario.fotoCapa
              ? `url(${usuario.fotoCapa})`
              : "none",
            backgroundPosition: usuario.fotoCapaPos
              ? `${usuario.fotoCapaPos.x}% ${usuario.fotoCapaPos.y}%`
              : "center"
          }}
        >
          <button
            className="btn-img"
            onClick={() => document.getElementById("capaInput").click()}
          >
            Alterar capa
          </button>

          <input
            id="capaInput"
            type="file"
            hidden
            onChange={(e) => handleImagem(e, "fotoCapa")}
          />
        </div>

        {/* PERFIL */}
        <div className="perfil-header">
          <div
            className="foto"
            style={{
              backgroundImage: usuario.fotoPerfil
                ? `url(${usuario.fotoPerfil})`
                : "none",
              backgroundPosition: usuario.fotoPerfilPos
                ? `${usuario.fotoPerfilPos.x}% ${usuario.fotoPerfilPos.y}%`
                : "center"
            }}
          >
            <button
              className="btn-img pequeno"
              onClick={() => document.getElementById("perfilInput").click()}
            >
              Alterar
            </button>
          </div>

          <input
            id="perfilInput"
            type="file"
            hidden
            onChange={(e) => handleImagem(e, "fotoPerfil")}
          />

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

          <p>{usuario.bio || "Sem bio..."}</p>
        </div>

        <button className="logout" onClick={logout}>
          Sair da conta
        </button>
      </div>

      {/* POPUP EDITAR */}
      {editando && (
        <div className="overlay">
          <div className="popup largo">

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

            <input
              placeholder="Email"
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
              <button onClick={() => setEditando(false)}>Cancelar</button>
            </div>

          </div>
        </div>
      )}

      {/* POPUP AJUSTE */}
      {ajuste && (
        <div className="overlay">
          <div className="popup largo">

            <h2>Ajustar Imagem</h2>

            <div
              className="ajuste-preview"
              style={{
                backgroundImage: `url(${ajuste.src})`,
                backgroundPosition: `${pos.x}% ${pos.y}%`
              }}
            ></div>

            <label>⬆️⬇️ Vertical</label>
            <input
              type="range"
              min="0"
              max="100"
              value={pos.y}
              onChange={(e) =>
                setPos({ ...pos, y: Number(e.target.value) })
              }
            />

            <label>⬅️➡️ Horizontal</label>
            <input
              type="range"
              min="0"
              max="100"
              value={pos.x}
              onChange={(e) =>
                setPos({ ...pos, x: Number(e.target.value) })
              }
            />

            <div className="popup-btns">
              <button onClick={aplicarImagem}>Aplicar</button>
              <button onClick={() => setAjuste(null)}>Cancelar</button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}