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

  const [editPosPerfil, setEditPosPerfil] = useState({ x: 50, y: 50 });
  const [editPosCapa, setEditPosCapa] = useState({ x: 50, y: 50 });

  const [previewPerfil, setPreviewPerfil] = useState(null);
  const [previewCapa, setPreviewCapa] = useState(null);

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
    function handleEsc(e) {
      if (e.key === "Escape") {
        setEditando(false);
        setEditandoPerfilImg(false);
        setEditandoCapaImg(false);
      }
    }

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  function salvar() {
    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const emailJaExiste = usuarios.find(
      (u) => u.email === form.email && u.email !== usuario.email
    );

    if (emailJaExiste) {
      setErro("Este email já está em uso!");
      return;
    }

    if (form.novaSenha || form.confirmarSenha) {
      if (!senhaAtual) {
        setErro("Digite a senha atual!");
        return;
      }

      const usuarioAtual = usuarios.find((u) => u.email === usuario.email);

      if (!usuarioAtual || senhaAtual !== usuarioAtual.senha) {
        setErro("Senha atual incorreta!");
        return;
      }

      if (form.novaSenha !== form.confirmarSenha) {
        setErro("As senhas não coincidem!");
        return;
      }
    }

    const atualizado = {
      ...form,
      fotoPerfil: previewPerfil || usuario.fotoPerfil,
      fotoCapa: previewCapa || usuario.fotoCapa,
      senha: form.novaSenha ? form.novaSenha : usuario.senha,
      posPerfil: editPosPerfil,
      posCapa: editPosCapa,
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

    setPosPerfil(editPosPerfil);
    setPosCapa(editPosCapa);

    setEditando(false);
    setEditandoPerfilImg(false);
    setEditandoCapaImg(false);

    setPreviewPerfil(null);
    setPreviewCapa(null);

    setErro("");
    setSenhaAtual("");

    setTimeout(() => setSucesso("Salvo com sucesso!"), 1500);
  }

  function handleImagem(e, tipo) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      if (tipo === "fotoPerfil") {
        setPreviewPerfil(reader.result);
        setEditandoPerfilImg(true);
        setEditPosPerfil(posPerfil);
      }

      if (tipo === "fotoCapa") {
        setPreviewCapa(reader.result);
        setEditandoCapaImg(true);
        setEditPosCapa(posCapa);
      }
    };

    reader.readAsDataURL(file);
  }

  function cancelarImagem(tipo) {
    if (tipo === "perfil") {
      setPreviewPerfil(null);
      setEditandoPerfilImg(false);
      setEditPosPerfil(posPerfil);
    }

    if (tipo === "capa") {
      setPreviewCapa(null);
      setEditandoCapaImg(false);
      setEditPosCapa(posCapa);
    }
  }

  function logout() {
    localStorage.removeItem("usuarioLogado");
    onLogout();
  }

  if (!usuario) {
    return <h1 style={{ color: "white", padding: "20px" }}>Carregando...</h1>;
  }

  return (
    <div className="home">
      <Sidebar onReload={irHome} irPerfil={() => {}} />

      <div className="profile-page">

        {/* TOPO */}
        <div className="topo-perfil">
          <span className="voltar" onClick={irHome}>←</span>
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
            backgroundPosition: `${posCapa.x}% ${posCapa.y}%`,
          }}
        />

        {/* PERFIL */}
        <div className="perfil-header">
          <div
            className="foto"
            style={{
              backgroundImage: `url(${usuario.fotoPerfil || ""})`,
              backgroundPosition: `${posPerfil.x}% ${posPerfil.y}%`,
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
        </div>

        <button className="logout" onClick={logout}>
          Sair da conta
        </button>

        {/* POPUP */}
        {editando && (
          <div className="overlay">
            <div className="popup">
              <button className="close-btn" onClick={() => setEditando(false)}>✕</button>

              <h2>Editar Perfil</h2>

              <input
                value={form.username || ""}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />

              <input
                value={form.bio || ""}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />

              <input
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                onChange={(e) => setForm({ ...form, novaSenha: e.target.value })}
              />

              <input
                type="password"
                placeholder="Confirmar senha"
                onChange={(e) => setForm({ ...form, confirmarSenha: e.target.value })}
              />

              {erro && <p className="erro">{erro}</p>}
              {sucesso && <p className="sucesso">{sucesso}</p>}

              {/* PREVIEW PERFIL */}
              {editandoPerfilImg && (
                <>
                  <div className="preview-wrapper-perfil">
                    <img
                      src={previewPerfil || usuario.fotoPerfil}
                      className="preview-img"
                      style={{
                        objectPosition: `${editPosPerfil.x}% ${editPosPerfil.y}%`
                      }}
                    />
                  </div>

                  <input type="range" min="0" max="100"
                    value={editPosPerfil.x}
                    onChange={(e) =>
                      setEditPosPerfil({ ...editPosPerfil, x: e.target.value })
                    }
                  />

                  <input type="range" min="0" max="100"
                    value={editPosPerfil.y}
                    onChange={(e) =>
                      setEditPosPerfil({ ...editPosPerfil, y: e.target.value })
                    }
                  />

                  <button onClick={() => cancelarImagem("perfil")}>
                    Cancelar
                  </button>
                </>
              )}

              <button onClick={() => document.getElementById("perfilInput").click()}>
                Foto Perfil
              </button>
              <input
                id="perfilInput"
                type="file"
                hidden
                onChange={(e) => handleImagem(e, "fotoPerfil")}
              />

              {/* PREVIEW CAPA */}
              {editandoCapaImg && (
                <>
                  <div className="preview-wrapper-capa">
                    <img
                      src={previewCapa || usuario.fotoCapa}
                      className="preview-img"
                      style={{
                        objectPosition: `${editPosCapa.x}% ${editPosCapa.y}%`
                      }}
                    />
                  </div>

                  <input type="range" min="0" max="100"
                    value={editPosCapa.x}
                    onChange={(e) =>
                      setEditPosCapa({ ...editPosCapa, x: e.target.value })
                    }
                  />

                  <input type="range" min="0" max="100"
                    value={editPosCapa.y}
                    onChange={(e) =>
                      setEditPosCapa({ ...editPosCapa, y: e.target.value })
                    }
                  />

                  <button onClick={() => cancelarImagem("capa")}>
                    Cancelar
                  </button>
                </>
              )}

              <button onClick={() => document.getElementById("capaInput").click()}>
                Foto Capa
              </button>
              <input
                id="capaInput"
                type="file"
                hidden
                onChange={(e) => handleImagem(e, "fotoCapa")}
              />

              <div className="popup-btns">
                <button onClick={salvar}>Salvar</button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}