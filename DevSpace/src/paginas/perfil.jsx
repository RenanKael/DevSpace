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

  // 🔥 carregar usuário SEM sobrescrever depois
  useEffect(() => {
    carregarUsuario();
  }, []);

  function carregarUsuario() {
    const user = JSON.parse(localStorage.getItem("usuarioLogado"));

    if (user) {
      if (!user.criadoEm) user.criadoEm = new Date().toISOString();

      setUsuario(user);
      setForm(user);
      setAvaliacao(user.avaliacao || 0);

      setPosPerfil(user.posPerfil || { x: 50, y: 50 });
      setPosCapa(user.posCapa || { x: 50, y: 50 });
    }
  }

  // ESC
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
    const atual = JSON.parse(localStorage.getItem("usuarioLogado")) || {};

    if (editandoImagem === "perfil") {
      atual.fotoPerfil = previewImg;
      atual.posPerfil = editPosPerfil;
    }

    if (editandoImagem === "capa") {
      atual.fotoCapa = previewImg;
      atual.posCapa = editPosCapa;
    }

    localStorage.setItem("usuarioLogado", JSON.stringify(atual));

    setEditandoImagem(null);
    setPreviewImg(null);

    carregarUsuario(); // 🔥 garante estado atualizado
  }

  function salvarPerfil() {
    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
    let atual = JSON.parse(localStorage.getItem("usuarioLogado")) || {};

    const emailExiste = usuarios.find(
      (u) => u.email === form.email && u.email !== atual.email
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

      if (senhaAtual !== atual.senha) {
        setErro("Senha atual incorreta!");
        return;
      }

      if (form.novaSenha !== form.confirmarSenha) {
        setErro("Senhas não coincidem!");
        return;
      }
    }

    // 🔥 aplica imagem pendente automaticamente
    if (previewImg && editandoImagem) {
      if (editandoImagem === "perfil") {
        atual.fotoPerfil = previewImg;
        atual.posPerfil = editPosPerfil;
      }

      if (editandoImagem === "capa") {
        atual.fotoCapa = previewImg;
        atual.posCapa = editPosCapa;
      }
    }

    const atualizado = {
      ...atual,
      ...form,
      senha: form.novaSenha ? form.novaSenha : atual.senha,
      avaliacao,
      posPerfil: atual.posPerfil || posPerfil,
      posCapa: atual.posCapa || posCapa
    };

    delete atualizado.novaSenha;
    delete atualizado.confirmarSenha;

    usuarios = usuarios.map((u) =>
      u.email === atual.email ? atualizado : u
    );

    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("usuarioLogado", JSON.stringify(atualizado));

    setEditando(false);
    setErro("");
    setSucesso("Perfil atualizado!");

    setPreviewImg(null);
    setEditandoImagem(null);

    carregarUsuario(); // 🔥 ESSA LINHA resolve o bug
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
          className="capa"
          style={{
            backgroundImage: `url(${usuario.fotoCapa || ""})`,
            backgroundPosition: `${posCapa.x}% ${posCapa.y}%`
          }}
        />

        <div className="perfil-header">
          <div
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

        {/* resto do código (modais) permanece exatamente igual */}
      </div>
    </div>
  );
}