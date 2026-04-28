import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";

export default function Perfil({ onLogout, irHome }) {
  const [usuario, setUsuario] = useState(null);
  const [editando, setEditando] = useState(false);

  const [editandoImagem, setEditandoImagem] = useState(null); 
  // "perfil" | "capa" | null

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

  function handleImagem(e, tipo) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setPreviewImg(reader.result);
      setEditandoImagem(tipo);

      if (tipo === "perfil") {
        setEditPosPerfil(posPerfil);
      } else {
        setEditPosCapa(posCapa);
      }
    };

    reader.readAsDataURL(file);
  }

  function salvarImagem() {
    const atualizado = { ...usuario };

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

    const emailExiste = usuarios.find(
      (u) => u.email === form.email && u.email !== usuario.email
    );

    if (emailExiste) {
      setErro("Email já está em uso!");
      return;
    }

    const atualizado = {
      ...usuario,
      ...form,
      senha:
        form.novaSenha && form.novaSenha === form.confirmarSenha
          ? form.novaSenha
          : usuario.senha,
      avaliacao,
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

        {/* TOPO */}
        <div className="topo-perfil">
          <span onClick={irHome}>←</span>
          <h3>{usuario.username}</h3>

          <div className="avaliacao">
            {[1,2,3,4,5].map(n => (
              <span key={n} className={n <= avaliacao ? "star ativa" : "star"}>★</span>
            ))}
          </div>
        </div>

        {/* CAPA */}
        <div
          className="capa"
          style={{
            backgroundImage: `url(${usuario.fotoCapa || ""})`,
            backgroundPosition: `${posCapa.x}% ${posCapa.y}%`
          }}
        />

        {/* PERFIL */}
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

        {/* INFO */}
        <div className="info">
          <h2>{usuario.username}</h2>
          <span>@{usuario.username}</span>

          <p className="bio">{usuario.bio || "Sem bio..."}</p>

          <p className="data">
            Criado em:{" "}
            {new Date(usuario.criadoEm).toLocaleDateString()}
          </p>
        </div>

        <button className="logout" onClick={logout}>
          Sair da conta
        </button>

        {/* ========================= */}
        {/* MODAL EDITAR PERFIL */}
        {/* ========================= */}
        {editando && (
          <div className="overlay">
            <div className="popup">

              <button className="close-btn" onClick={() => setEditando(false)}>✕</button>

              <h2>Editar Perfil</h2>

              <input
                value={form.username || ""}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="Nome"
              />

              <input
                value={form.bio || ""}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Bio"
              />

              <input
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
              />

              <input
                type="password"
                placeholder="Senha atual"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
              />

              <input
                type="password"
                placeholder="Nova senha"
                onChange={(e) =>
                  setForm({ ...form, novaSenha: e.target.value })
                }
              />

              <input
                type="password"
                placeholder="Confirmar senha"
                onChange={(e) =>
                  setForm({ ...form, confirmarSenha: e.target.value })
                }
              />

              <button onClick={() => setEditandoImagem("perfil")}>
                Alterar Foto Perfil
              </button>

              <button onClick={() => setEditandoImagem("capa")}>
                Alterar Capa
              </button>

              {erro && <p className="erro">{erro}</p>}
              {sucesso && <p className="sucesso">{sucesso}</p>}

              <div className="popup-btns">
                <button onClick={salvarPerfil}>Salvar</button>
                <button onClick={() => setEditando(false)}>Cancelar</button>
              </div>

            </div>
          </div>
        )}

        {/* ========================= */}
        {/* MODAL IMAGEM SEPARADO */}
        {/* ========================= */}
        {editandoImagem && (
          <div className="overlay">
            <div className="popup">

              <h2>Editar Imagem</h2>

              <div className="preview-box">
                <img
                  src={previewImg}
                  className="preview-img"
                  style={{
                    objectPosition:
                      editandoImagem === "perfil"
                        ? `${editPosPerfil.x}% ${editPosPerfil.y}%`
                        : `${editPosCapa.x}% ${editPosCapa.y}%`
                  }}
                />
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={
                  editandoImagem === "perfil"
                    ? editPosPerfil.x
                    : editPosCapa.x
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (editandoImagem === "perfil") {
                    setEditPosPerfil({ ...editPosPerfil, x: value });
                  } else {
                    setEditPosCapa({ ...editPosCapa, x: value });
                  }
                }}
              />

              <input
                type="range"
                min="0"
                max="100"
                value={
                  editandoImagem === "perfil"
                    ? editPosPerfil.y
                    : editPosCapa.y
                }
                onChange={(e) => {
                  const value = e.target.value;
                  if (editandoImagem === "perfil") {
                    setEditPosPerfil({ ...editPosPerfil, y: value });
                  } else {
                    setEditPosCapa({ ...editPosCapa, y: value });
                  }
                }}
              />

              <div className="popup-btns">
                <button onClick={salvarImagem}>Salvar Imagem</button>
                <button onClick={() => setEditandoImagem(null)}>
                  Cancelar
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}