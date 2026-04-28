import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";
import { createPortal } from "react-dom";

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
    let user = JSON.parse(localStorage.getItem("usuarioLogado"));

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
    let atualizado = JSON.parse(localStorage.getItem("usuarioLogado")) || {};
    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

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

    usuarios = usuarios.map((u) =>
      u.email === atualizado.email ? atualizado : u
    );

    localStorage.setItem("usuarios", JSON.stringify(usuarios));
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

    let novaPosPerfil = posPerfil;
    let novaPosCapa = posCapa;

    if (previewImg && editandoImagem === "perfil") {
      atualizadoUsuario.fotoPerfil = previewImg;
      atualizadoUsuario.posPerfil = editPosPerfil;
      novaPosPerfil = editPosPerfil;
    }

    if (previewImg && editandoImagem === "capa") {
      atualizadoUsuario.fotoCapa = previewImg;
      atualizadoUsuario.posCapa = editPosCapa;
      novaPosCapa = editPosCapa;
    }

    const atualizado = {
      ...atualizadoUsuario,
      ...form,
      senha: form.novaSenha ? form.novaSenha : atualizadoUsuario.senha,
      avaliacao,
      posPerfil: novaPosPerfil,
      posCapa: novaPosCapa
    };

    delete atualizado.novaSenha;
    delete atualizado.confirmarSenha;

    usuarios = usuarios.map((u) =>
      u.email === usuario.email ? atualizado : u
    );

    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("usuarioLogado", JSON.stringify(atualizado));

    setUsuario(atualizado);
    setPosPerfil(novaPosPerfil);
    setPosCapa(novaPosCapa);

    setPreviewImg(null);
    setEditandoImagem(null);

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
          className="capa"
          style={{
            backgroundImage: usuario.fotoCapa ? `url(${usuario.fotoCapa})` : "none",
            backgroundPosition: `${posCapa.x}% ${posCapa.y}%`
          }}
        />

        <div className="perfil-header">
          <div
            className="foto"
            style={{
              backgroundImage: usuario.fotoPerfil ? `url(${usuario.fotoPerfil})` : "none",
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

        {editando && createPortal(
          <div className="overlay">
            <div className="popup">
              <button className="close-btn" onClick={() => setEditando(false)}>✕</button>

              <h2>Editar Perfil</h2>

              <input value={form.username || ""} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Nome" />
              <input value={form.bio || ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Bio" />
              <input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" />

              <input type="password" placeholder="Senha atual" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
              <input type="password" placeholder="Nova senha" onChange={(e) => setForm({ ...form, novaSenha: e.target.value })} />
              <input type="password" placeholder="Confirmar senha" onChange={(e) => setForm({ ...form, confirmarSenha: e.target.value })} />

              <button onClick={() => document.getElementById("perfil").click()}>Alterar Foto Perfil</button>
              <input id="perfil" type="file" hidden onChange={(e) => handleImagem(e, "perfil")} />

              <button onClick={() => document.getElementById("capa").click()}>Alterar Capa</button>
              <input id="capa" type="file" hidden onChange={(e) => handleImagem(e, "capa")} />

              {erro && <p>{erro}</p>}
              {sucesso && <p>{sucesso}</p>}

              <div className="popup-btns">
                <button onClick={salvarPerfil}>Salvar</button>
                <button onClick={() => setEditando(false)}>Cancelar</button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {editandoImagem && createPortal(
          <div className="overlay">
            <div className="popup">

              <h2>Editar Imagem</h2>

              <div className="preview-box">
                <img
                  src={previewImg}
                  className={editandoImagem === "perfil" ? "preview-img perfil" : "preview-img capa"}
                  style={{
                    objectPosition:
                      editandoImagem === "perfil"
                        ? `${editPosPerfil.x}% ${editPosPerfil.y}%`
                        : `${editPosCapa.x}% ${editPosCapa.y}%`
                  }}
                />
              </div>

              <input type="range" min="0" max="100"
                value={editandoImagem === "perfil" ? editPosPerfil.x : editPosCapa.x}
                onChange={(e) => {
                  const v = e.target.value;
                  if (editandoImagem === "perfil") {
                    setEditPosPerfil({ ...editPosPerfil, x: v });
                  } else {
                    setEditPosCapa({ ...editPosCapa, x: v });
                  }
                }}
              />

              <input type="range" min="0" max="100"
                value={editandoImagem === "perfil" ? editPosPerfil.y : editPosCapa.y}
                onChange={(e) => {
                  const v = e.target.value;
                  if (editandoImagem === "perfil") {
                    setEditPosPerfil({ ...editPosPerfil, y: v });
                  } else {
                    setEditPosCapa({ ...editPosCapa, y: v });
                  }
                }}
              />

              <div className="popup-btns">
                <button onClick={salvarImagem}>Salvar Imagem</button>
                <button onClick={() => setEditandoImagem(null)}>Cancelar</button>
              </div>

            </div>
          </div>,
          document.body
        )}

      </div>
    </div>
  );
}