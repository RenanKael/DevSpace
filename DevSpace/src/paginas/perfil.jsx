import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";

export default function Perfil({ onLogout, irHome }) {
  const [usuario, setUsuario] = useState(null);

  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [editandoImagem, setEditandoImagem] = useState(null);

  const [form, setForm] = useState({});
  const [senhaAtual, setSenhaAtual] = useState("");

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [fileTemp, setFileTemp] = useState(null);

  const [posPerfil, setPosPerfil] = useState({ x: 50, y: 50 });
  const [posCapa, setPosCapa] = useState({ x: 50, y: 50 });

  const [avaliacao, setAvaliacao] = useState(0);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuarioLogado"));

    if (user) {
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

    reader.onload = () => {
      setFileTemp(reader.result);
      setEditandoImagem(tipo);
    };

    reader.readAsDataURL(file);
  }

  function salvarImagem() {
    const atualizado = { ...usuario };

    if (editandoImagem === "perfil") {
      atualizado.fotoPerfil = fileTemp;
      atualizado.posPerfil = posPerfil;
    }

    if (editandoImagem === "capa") {
      atualizado.fotoCapa = fileTemp;
      atualizado.posCapa = posCapa;
    }

    localStorage.setItem("usuarioLogado", JSON.stringify(atualizado));

    setUsuario(atualizado);
    setEditandoImagem(null);
    setFileTemp(null);
  }

  function salvarPerfil() {
    const atualizado = {
      ...usuario,
      ...form
    };

    localStorage.setItem("usuarioLogado", JSON.stringify(atualizado));
    setUsuario(atualizado);
    setEditandoPerfil(false);

    setSucesso("Perfil atualizado!");
    setErro("");
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
          <span className="voltar" onClick={irHome}>←</span>
          <h3>{usuario.username}</h3>

          {/* ESTRELAS */}
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
            backgroundImage: `url(${usuario.fotoCapa})`,
            backgroundPosition: `${posCapa.x}% ${posCapa.y}%`
          }}
        />

        {/* PERFIL HEADER */}
        <div className="perfil-header">

          <div
            className="foto"
            style={{
              backgroundImage: `url(${usuario.fotoPerfil})`,
              backgroundPosition: `${posPerfil.x}% ${posPerfil.y}%`
            }}
          />

          {/* STATS */}
          <div className="stats">
            <span><b>{usuario.seguindo || 0}</b> Seguindo</span>
            <span><b>{usuario.seguidores || 0}</b> Seguidores</span>
            <span><b>{usuario.projetos?.length || 0}</b> Projetos</span>
          </div>

          <button className="btn-editar" onClick={() => setEditandoPerfil(true)}>
            Editar Perfil
          </button>
        </div>

        {/* INFO */}
        <div className="info">
          <h2>{usuario.username}</h2>
          <span>@{usuario.username}</span>

          {/* DATA CRIAÇÃO */}
          <p style={{ color: "#aaa", fontSize: "13px" }}>
            Conta criada em:{" "}
            {usuario.criadoEm
              ? new Date(usuario.criadoEm).toLocaleDateString()
              : "Desconhecido"}
          </p>

          <p className="bio">{usuario.bio || "Sem bio..."}</p>
        </div>

        <button className="logout" onClick={logout}>
          Sair da conta
        </button>

        {/* ========================= */}
        {/* MODAL PERFIL */}
        {/* ========================= */}
        {editandoPerfil && (
          <div className="overlay">
            <div className="popup">

              <h2>Editar Perfil</h2>

              <input
                value={form.username || ""}
                onChange={(e) =>
                  setForm({ ...form, username: e.target.value })
                }
                placeholder="Nome"
              />

              <input
                value={form.bio || ""}
                onChange={(e) =>
                  setForm({ ...form, bio: e.target.value })
                }
                placeholder="Bio"
              />

              <button onClick={() => setEditandoImagem("perfil")}>
                Alterar Foto Perfil
              </button>

              <button onClick={() => setEditandoImagem("capa")}>
                Alterar Capa
              </button>

              <div className="popup-btns">
                <button onClick={salvarPerfil}>Salvar</button>
                <button onClick={() => setEditandoPerfil(false)}>Cancelar</button>
              </div>

            </div>
          </div>
        )}

        {/* ========================= */}
        {/* MODAL IMAGEM */}
        {/* ========================= */}
        {editandoImagem && (
          <div className="overlay">
            <div className="popup">

              <h2>Ajustar Imagem</h2>

              <div className="preview-wrapper-perfil">
                <img
                  src={fileTemp}
                  style={{
                    objectFit: "cover",
                    objectPosition:
                      editandoImagem === "perfil"
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