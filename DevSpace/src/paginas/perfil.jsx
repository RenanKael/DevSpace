import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";

export default function Perfil({ onLogout, irHome }) {
  const [usuario, setUsuario] = useState(null);

  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [editandoImagem, setEditandoImagem] = useState(null); // "perfil" | "capa" | null

  const [form, setForm] = useState({});
  const [senhaAtual, setSenhaAtual] = useState("");

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [previewImg, setPreviewImg] = useState(null);

  const [posPerfil, setPosPerfil] = useState({ x: 50, y: 50 });
  const [posCapa, setPosCapa] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuarioLogado"));
    if (user) {
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
    reader.onload = () => {
      setPreviewImg(reader.result);
      setEditandoImagem(tipo); // abre modal separado
    };
    reader.readAsDataURL(file);
  }

  function salvarImagem() {
    const atualizado = { ...usuario };

    if (editandoImagem === "perfil") {
      atualizado.fotoPerfil = previewImg;
      atualizado.posPerfil = posPerfil;
    }

    if (editandoImagem === "capa") {
      atualizado.fotoCapa = previewImg;
      atualizado.posCapa = posCapa;
    }

    localStorage.setItem("usuarioLogado", JSON.stringify(atualizado));

    setUsuario(atualizado);
    setEditandoImagem(null);
    setPreviewImg(null);
  }

  function salvarPerfil() {
    const atualizado = {
      ...usuario,
      ...form
    };

    localStorage.setItem("usuarioLogado", JSON.stringify(atualizado));
    setUsuario(atualizado);
    setEditandoPerfil(false);
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
        </div>

        {/* CAPA */}
        <div
          className="capa"
          style={{
            backgroundImage: `url(${usuario.fotoCapa})`,
            backgroundPosition: `${posCapa.x}% ${posCapa.y}%`
          }}
        />

        {/* PERFIL */}
        <div className="perfil-header">

          <div
            className="foto"
            style={{
              backgroundImage: `url(${usuario.fotoPerfil})`,
              backgroundPosition: `${posPerfil.x}% ${posPerfil.y}%`
            }}
          />

          <button onClick={() => setEditandoPerfil(true)}>
            Editar Perfil
          </button>
        </div>

        {/* ========================= */}
        {/* MODAL EDITAR PERFIL */}
        {/* ========================= */}
        {editandoPerfil && (
          <div className="overlay">
            <div className="popup">

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

              <button onClick={() => setEditandoImagem("perfil")}>
                Trocar Foto Perfil
              </button>

              <button onClick={() => setEditandoImagem("capa")}>
                Trocar Capa
              </button>

              <div className="popup-btns">
                <button onClick={salvarPerfil}>Salvar</button>
                <button onClick={() => setEditandoPerfil(false)}>Cancelar</button>
              </div>

            </div>
          </div>
        )}

        {/* ========================= */}
        {/* MODAL IMAGEM (NOVO - SEPARADO) */}
        {/* ========================= */}
        {editandoImagem && (
          <div className="overlay">
            <div className="popup">

              <h2>Editar Imagem</h2>

              <div className="preview-box">
                <img
                  src={previewImg}
                  className={editandoImagem === "perfil" ? "preview-perfil" : "preview-capa"}
                  style={{
                    objectPosition: editandoImagem === "perfil"
                      ? `${posPerfil.x}% ${posPerfil.y}%`
                      : `${posCapa.x}% ${posCapa.y}%`
                  }}
                />
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={editandoImagem === "perfil" ? posPerfil.x : posCapa.x}
                onChange={(e) => {
                  const value = e.target.value;
                  if (editandoImagem === "perfil") {
                    setPosPerfil({ ...posPerfil, x: value });
                  } else {
                    setPosCapa({ ...posCapa, x: value });
                  }
                }}
              />

              <input
                type="range"
                min="0"
                max="100"
                value={editandoImagem === "perfil" ? posPerfil.y : posCapa.y}
                onChange={(e) => {
                  const value = e.target.value;
                  if (editandoImagem === "perfil") {
                    setPosPerfil({ ...posPerfil, y: value });
                  } else {
                    setPosCapa({ ...posCapa, y: value });
                  }
                }}
              />

              <div className="popup-btns">
                <button onClick={salvarImagem}>Salvar Imagem</button>
                <button onClick={() => setEditandoImagem(null)}>Cancelar</button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}