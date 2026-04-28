import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";

export default function Perfil({ onLogout, irHome }) {
  const [usuario, setUsuario] = useState(null);
  const [editando, setEditando] = useState(false);

  const [editandoImagem, setEditandoImagem] = useState(null);

  const [form, setForm] = useState({});
  const [senhaAtual, setSenhaAtual] = useState("");

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [previewImg, setPreviewImg] = useState(null);

  const [posPerfil, setPosPerfil] = useState({ x: 50, y: 50 });
  const [posCapa, setPosCapa] = useState({ x: 50, y: 50 });

  const [editPosPerfil, setEditPosPerfil] = useState({ x: 50, y: 50 });
  const [editPosCapa, setEditPosCapa] = useState({ x: 50, y: 50 });

  const [avaliacao, setAvaliacao] = useState(0);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuarioLogado"));

    if (user) {
      if (!user.criadoEm) user.criadoEm = new Date().toISOString();

      setUsuario(user);
      setForm(user);
      setAvaliacao(user.avaliacao || 0);

      setPosPerfil(user.posPerfil || { x: 50, y: 50 });
      setPosCapa(user.posCapa || { x: 50, y: 50 });
    }
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setEditando(false);
        setEditandoImagem(null);
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  function handleImagem(e, tipo) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setPreviewImg(reader.result);
      setEditandoImagem(tipo);

      if (tipo === "perfil") setEditPosPerfil(posPerfil);
      if (tipo === "capa") setEditPosCapa(posCapa);
    };

    reader.readAsDataURL(file);
  }

  function salvarImagem() {
    const atualizado = JSON.parse(localStorage.getItem("usuarioLogado")) || {};

    if (editandoImagem === "perfil") {
      atualizado.fotoPerfil = previewImg;
      atualizado.posPerfil = editPosPerfil;
      setPosPerfil(editPosPerfil);
    }

    if (editandoImagem === "capa") {
      atualizado.fotoCapa = previewImg;
      atualizado.posCapa = editPosCapa;
      setPosCapa(editPosCapa);
    }

    localStorage.setItem("usuarioLogado", JSON.stringify(atualizado));
    setUsuario(atualizado);

    setEditandoImagem(null);
    setPreviewImg(null);
  }

  function salvarPerfil() {
    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    let atualizadoUsuario = JSON.parse(localStorage.getItem("usuarioLogado")) || {};

    const emailExiste = usuarios.find(
      (u) => u.email === form.email && u.email !== usuario.email
    );

    if (emailExiste) {
      setErro("Email já está em uso!");
      return;
    }

    if (form.novaSenha || form.confirmarSenha) {
      if (!senhaAtual) {
        setErro("Digite a senha atual!");
        return;
      }

      if (senhaAtual !== usuario.senha) {
        setErro("Senha atual incorreta!");
        return;
      }

      if (form.novaSenha !== form.confirmarSenha) {
        setErro("Senhas não coincidem!");
        return;
      }
    }

    // salvar imagem pendente
    if (previewImg && editandoImagem) {
      if (editandoImagem === "perfil") {
        atualizadoUsuario.fotoPerfil = previewImg;
        atualizadoUsuario.posPerfil = editPosPerfil;
        setPosPerfil(editPosPerfil);
      }

      if (editandoImagem === "capa") {
        atualizadoUsuario.fotoCapa = previewImg;
        atualizadoUsuario.posCapa = editPosCapa;
        setPosCapa(editPosCapa);
      }

      setPreviewImg(null);
      setEditandoImagem(null);
    }

    const atualizado = {
      ...atualizadoUsuario,
      ...form,
      senha: form.novaSenha ? form.novaSenha : atualizadoUsuario.senha,
      avaliacao,
      posPerfil,
      posCapa
    };

    delete atualizado.novaSenha;
    delete atualizado.confirmarSenha;

    usuarios = usuarios.map((u) =>
      u.email === usuario.email ? atualizado : u
    );

    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("usuarioLogado", JSON.stringify(atualizado));

    setUsuario(atualizado);
    setEditando(false);

    setErro("");
    setSucesso("Perfil atualizado!");
  }

  function logout() {
    localStorage.removeItem("usuarioLogado");
    onLogout();
  }

  if (!usuario) return <h1>Carregando...</h1>;

  return (
    <div className="home">
      <Sidebar onReload={irHome} />

      <div className="profile-page">

        <div className="topo-perfil">
          <span onClick={irHome}>←</span>
          <h3>{usuario.username}</h3>

          <div className="avaliacao">
            {[1,2,3,4,5].map(n => (
              <span key={n} className={n <= avaliacao ? "star ativa" : "star"}>★</span>
            ))}
          </div>
        </div>

        <div
          key={usuario.fotoCapa}
          className="capa"
          style={{
            backgroundImage: `url(${usuario.fotoCapa || ""})`,
            backgroundPosition: `${posCapa.x}% ${posCapa.y}%`
          }}
        />

        <div className="perfil-header">
          <div
            key={usuario.fotoPerfil}
            className="foto"
            style={{
              backgroundImage: `url(${usuario.fotoPerfil || ""})`,
              backgroundPosition: `${posPerfil.x}% ${posPerfil.y}%`
            }}
          />

          <div className="stats">
            <span><b>0</b> Seguindo</span>
            <span><b>0</b> Seguidores</span>
            <span><b>{usuario.projetos?.length || 0}</b> Projetos</span>
          </div>

          <button className="btn-editar" onClick={() => setEditando(true)}>
            Editar Perfil
          </button>
        </div>

        <div className="info">
          <h2>{usuario.username}</h2>
          <span>@{usuario.username}</span>

          <p className="bio">{usuario.bio || "Sem bio..."}</p>

          <p className="data">
            Criado em: {new Date(usuario.criadoEm).toLocaleDateString()}
          </p>
        </div>

        <button className="logout" onClick={logout}>
          Sair da conta
        </button>

        {/* teus modais continuam aqui (sem alteração) */}

      </div>
    </div>
  );
}