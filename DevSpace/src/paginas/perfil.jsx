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

  const [avaliacao, setAvaliacao] = useState(0);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuarioLogado"));

    if (user) {
      if (!user.criadoEm) {
        user.criadoEm = new Date().toISOString();
      }

      setUsuario(user);
      setForm(user);
      setAvaliacao(user.avaliacao || 0);

      setPosPerfil(user.posPerfil || { x: 50, y: 50 });
      setPosCapa(user.posCapa || { x: 50, y: 50 });
    }

    // 🔥 ESC fecha tudo
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setEditando(false);
        setEditandoPerfilImg(false);
        setEditandoCapaImg(false);
      }
    };

    window.addEventListener("keydown", handleEsc);

    return () => {
      window.removeEventListener("keydown", handleEsc);
    };
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

      if (senhaAtual !== usuario.senha) {
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
      senha: form.novaSenha ? form.novaSenha : usuario.senha,
      posPerfil,
      posCapa,
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
    setSucesso("Salvo com sucesso!");
    setErro("");
    setSenhaAtual("");

    setTimeout(() => setSucesso(""), 2000);
  }

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

  if (!usuario) {
    return <h1 style={{ color: "white", padding: "20px" }}>Carregando...</h1>;
  }

  return (
    <div className="home">
      <Sidebar onReload={irHome} irPerfil={() => {}} />

      <div className="profile-page">

        <div className="topo-perfil">
          <span className="voltar" onClick={irHome}>←</span>
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
          <p className="data">
            Entrou em {new Date(usuario.criadoEm).toLocaleDateString("pt-BR")}
          </p>
          <p className="bio">{usuario.bio || "Sem bio..."}</p>
        </div>

        <button className="logout" onClick={logout}>
          Sair da conta
        </button>

        {/* POPUP PRINCIPAL */}
        {editando && (
          <div className="overlay">
            <div className="popup">
              <button className="close-btn" onClick={() => setEditando(false)}>✕</button>

              <h2>Editar Perfil</h2>

              <input value={form.username || ""} onChange={(e)=>setForm({...form, username:e.target.value})}/>
              <input value={form.bio || ""} onChange={(e)=>setForm({...form, bio:e.target.value})}/>
              <input value={form.email || ""} onChange={(e)=>setForm({...form, email:e.target.value})}/>

              <input type="password" placeholder="Senha atual"
                value={senhaAtual}
                onChange={(e)=>setSenhaAtual(e.target.value)}
              />

              <input type="password" placeholder="Nova senha"
                value={form.novaSenha || ""}
                onChange={(e)=>setForm({...form, novaSenha:e.target.value})}
              />

              <input type="password" placeholder="Confirmar nova senha"
                value={form.confirmarSenha || ""}
                onChange={(e)=>setForm({...form, confirmarSenha:e.target.value})}
              />

              {erro && <p className="erro">{erro}</p>}
              {sucesso && <p className="sucesso">{sucesso}</p>}

              <button onClick={()=>document.getElementById("perfilInput").click()}>
                Foto Perfil
              </button>
              <input id="perfilInput" type="file" hidden onChange={(e)=>handleImagem(e,"fotoPerfil")}/>

              <button onClick={()=>document.getElementById("capaInput").click()}>
                Foto Capa
              </button>
              <input id="capaInput" type="file" hidden onChange={(e)=>handleImagem(e,"fotoCapa")}/>

              <div className="popup-btns">
                <button onClick={salvar}>Salvar</button>
              </div>
            </div>
          </div>
        )}

        {/* EDITAR PERFIL IMG */}
        {editandoPerfilImg && (
          <div className="overlay">
            <div className="popup small">
              <h2>Ajustar Foto</h2>

              <div className="preview-perfil-box">
                <div className="preview-perfil"
                  style={{
                    backgroundImage: `url(${form.fotoPerfil})`,
                    backgroundPosition: `${posPerfil.x}% ${posPerfil.y}%`
                  }}
                ></div>
              </div>

              <input type="range" min="0" max="100"
                value={posPerfil.y}
                onChange={(e)=>setPosPerfil({...posPerfil, y:e.target.value})}
              />

              <input type="range" min="0" max="100"
                value={posPerfil.x}
                onChange={(e)=>setPosPerfil({...posPerfil, x:e.target.value})}
              />

              <div className="popup-btns">
                <button onClick={()=>setEditandoPerfilImg(false)}>OK</button>
                <button onClick={()=>cancelarImagem("perfil")}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* EDITAR CAPA */}
        {editandoCapaImg && (
          <div className="overlay">
            <div className="popup small">
              <h2>Ajustar Capa</h2>

              <div className="preview-capa-box">
                <div className="preview-capa"
                  style={{
                    backgroundImage: `url(${form.fotoCapa})`,
                    backgroundPosition: `${posCapa.x}% ${posCapa.y}%`
                  }}
                ></div>
              </div>

              <input type="range" min="0" max="100"
                value={posCapa.y}
                onChange={(e)=>setPosCapa({...posCapa, y:e.target.value})}
              />

              <input type="range" min="0" max="100"
                value={posCapa.x}
                onChange={(e)=>setPosCapa({...posCapa, x:e.target.value})}
              />

              <div className="popup-btns">
                <button onClick={()=>setEditandoCapaImg(false)}>OK</button>
                <button onClick={()=>cancelarImagem("capa")}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}