import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";

export default function Perfil({ onLogout, irHome }) {
  const [usuario, setUsuario] = useState(null);
  const [editando, setEditando] = useState(false);

  const [form, setForm] = useState({});
  const [confirmarSenha, setConfirmarSenha] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (user) {
      setUsuario(user);
      setForm(user);
    }
  }, []);

  function salvarAlteracoes() {
    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    // 🔐 se for alterar email ou senha, pede confirmação
    if (
      (form.email !== usuario.email || form.senha !== usuario.senha) &&
      confirmarSenha !== usuario.senha
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
    setConfirmarSenha("");
  }

  function logout() {
    localStorage.removeItem("usuarioLogado");
    onLogout();
  }

  if (!usuario) return null;

  return (
    <div className="home">
      {/* 🔥 Sidebar funcionando */}
      <Sidebar
        onReload={irHome}
        irPerfil={() => {}}
      />

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

        {/* FOTO + BOTÃO */}
        <div className="perfil-header">
          <div
            className="foto"
            style={{
              backgroundImage: usuario.fotoPerfil
                ? `url(${usuario.fotoPerfil})`
                : "none",
            }}
          ></div>

          <button onClick={() => setEditando(true)}>
            Editar Perfil
          </button>
        </div>

        {/* INFO */}
        <div className="info">
          <h2>{usuario.username}</h2>
          <span>@{usuario.username}</span>

          <p>
            Entrou em{" "}
            {usuario.criadoEm
              ? new Date(usuario.criadoEm).toLocaleDateString()
              : "..."}
          </p>

          <p>{usuario.bio || "Sem bio..."}</p>

          {/* ESTRELAS */}
          <div className="estrelas">
            {"★".repeat(usuario.estrelas || 1)}
            {"☆".repeat(5 - (usuario.estrelas || 1))}
          </div>
        </div>

        {/* PROJETOS */}
        <div className="projetos">
          <h3>Projetos</h3>

          {!usuario.projetos || usuario.projetos.length === 0 ? (
            <div className="criar-projeto">
              + Criar Projeto
            </div>
          ) : (
            usuario.projetos.map((p, i) => (
              <div key={i} className="projeto-item">
                {p}
              </div>
            ))
          )}
        </div>

        {/* LOGOUT */}
        <button className="logout" onClick={logout}>
          Sair da conta
        </button>

        {/* POPUP */}
        {editando && (
          <div className="popup">
            <div className="popup-content">

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
                placeholder="Foto de perfil (URL)"
                onChange={(e) =>
                  setForm({ ...form, fotoPerfil: e.target.value })
                }
              />

              <input
                placeholder="Foto de capa (URL)"
                onChange={(e) =>
                  setForm({ ...form, fotoCapa: e.target.value })
                }
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

              {/* 🔐 confirmação */}
              <input
                type="password"
                placeholder="Confirme sua senha atual"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
              />

              <button onClick={salvarAlteracoes}>
                Salvar
              </button>

              <button onClick={() => setEditando(false)}>
                Cancelar
              </button>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}