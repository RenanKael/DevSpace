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

  // 🔥 ESC fecha qualquer popup aberto
  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") {
        if (editandoPerfilImg) {
          setEditandoPerfilImg(false);
        } else if (editandoCapaImg) {
          setEditandoCapaImg(false);
        } else if (editando) {
          setEditando(false);
        }
      }
    }

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [editando, editandoPerfilImg, editandoCapaImg]);

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

  function cancelarImagem(tipo) {
    if (tipo === "perfil") {
      setForm((prev) => ({ ...prev, fotoPerfil: usuario.fotoPerfil }));
      setPosPerfil(usuario.posPerfil || { x: 50, y: 50 });
      setEditandoPerfilImg(false);
    }

    if (tipo === "capa") {
      setForm((prev) => ({ ...prev, fotoCapa: usuario.fotoCapa }));
      setPosCapa(usuario.posCapa || { x: 50, y: 50 });
      setEditandoCapaImg(false);
    }
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

            {/* resto igual... */}
          </div>
        </div>
      )}

      {/* resto do código continua igual */}
    </div>
  );
}