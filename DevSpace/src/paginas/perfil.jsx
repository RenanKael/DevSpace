import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";

export default function Perfil({ onLogout, irHome }) {
  const [usuario, setUsuario] = useState(null);
  const [editando, setEditando] = useState(false);

  const [form, setForm] = useState({});
  const [senhaAtual, setSenhaAtual] = useState("");

  useEffect(() => {
    let user = JSON.parse(localStorage.getItem("usuarioLogado"));

    if (user) {
      // 🔥 garante data de criação
      if (!user.criadoEm) {
        user.criadoEm = new Date().toISOString();

        localStorage.setItem("usuarioLogado", JSON.stringify(user));

        let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

        usuarios = usuarios.map((u) =>
          u.email === user.email
            ? { ...u, criadoEm: user.criadoEm }
            : u
        );

        localStorage.setItem("usuarios", JSON.stringify(usuarios));
      }

      setUsuario(user);
      setForm(user);
    }
  }, []);

  // 🔥 função upload imagem
  function handleImagem(e, tipo) {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2000000) {
      alert("Imagem muito grande! Máx: 2MB");
      return;
    }

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

    usuarios = usuarios.map((u) =>
      u.email === usuario.email ? { ...u, ...form } : u
    );

    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("usuarioLogado", JSON.stringify(form));

    setUsuario(form);
    setEditando(false);
    setSenhaAtual("");
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

          <button
            className="btn-editar"
            onClick={() => setEditando(true)}
          >
            Editar Perfil
          </button>
        </div>

        {/* INFO */}
        <div className="info">
          <h2>{usuario.username}</h2>
          <span>@{usuario.username}</span>

          <p className="data">
            Entrou em{" "}
            {new Date(usuario.criadoEm).toLocaleDateString("pt-BR")}
          </p>

          <p className="bio">
            {usuario.bio || "Sem bio..."}
          </p>
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
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImagem(e, "fotoPerfil")}
            />

            {form.fotoPerfil && (
              <img src={form.fotoPerfil} className="preview-img" />
            )}

            {/* FOTO CAPA */}
            <label>Foto de Capa</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImagem(e, "fotoCapa")}
            />

            {form.fotoCapa && (
              <img src={form.fotoCapa} className="preview-capa" />
            )}

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
              placeholder="Senha atual (obrigatório)"
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