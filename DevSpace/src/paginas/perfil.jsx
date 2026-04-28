import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";

export default function Perfil({ onLogout, irHome }) {
  const [usuario, setUsuario] = useState(null);
  const [editando, setEditando] = useState(false);

  const [editandoPerfilImg, setEditandoPerfilImg] = useState(false);
  const [editandoCapaImg, setEditandoCapaImg] = useState(false);

  const [form, setForm] = useState({});

  // 🔥 estados reais
  const [posPerfil, setPosPerfil] = useState({ x: 50, y: 50 });
  const [posCapa, setPosCapa] = useState({ x: 50, y: 50 });

  // 🔥 estados TEMPORÁRIOS (CORREÇÃO DO BUG)
  const [tempPerfil, setTempPerfil] = useState({ x: 50, y: 50 });
  const [tempCapa, setTempCapa] = useState({ x: 50, y: 50 });

  const [avaliacao, setAvaliacao] = useState(0);

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

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
    reader.onloadend = () => {
      setForm((prev) => ({
        ...prev,
        [tipo]: reader.result,
      }));

      // 🔥 inicia TEMP
      if (tipo === "fotoPerfil") {
        setTempPerfil(posPerfil);
        setEditandoPerfilImg(true);
      }

      if (tipo === "fotoCapa") {
        setTempCapa(posCapa);
        setEditandoCapaImg(true);
      }
    };

    reader.readAsDataURL(file);
  }

  function salvar() {
    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const atualizado = {
      ...form,
      posPerfil,
      posCapa,
      avaliacao,
      senha: novaSenha ? novaSenha : form.senha
    };

    usuarios = usuarios.map((u) =>
      u.email === usuario.email ? atualizado : u
    );

    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("usuarioLogado", JSON.stringify(atualizado));

    setUsuario(atualizado);
    setEditando(false);
  }

  function aplicarPerfil() {
    setPosPerfil(tempPerfil);
    setEditandoPerfilImg(false);
  }

  function aplicarCapa() {
    setPosCapa(tempCapa);
    setEditandoCapaImg(false);
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

        {/* CAPA */}
        <div
          className="capa"
          style={{
            backgroundImage: `url(${usuario.fotoCapa || ""})`,
            backgroundPosition: `${posCapa.x}% ${posCapa.y}%`,
          }}
        />

        {/* FOTO */}
        <div
          className="foto"
          style={{
            backgroundImage: `url(${usuario.fotoPerfil || ""})`,
            backgroundPosition: `${posPerfil.x}% ${posPerfil.y}%`,
          }}
        />

        <button onClick={() => setEditando(true)}>Editar</button>

        {/* POPUP */}
        {editando && (
          <div className="overlay">
            <div className="popup">

              <h2>Editar Perfil</h2>

              <input
                value={form.username || ""}
                onChange={(e)=>setForm({...form, username:e.target.value})}
              />

              {/* 🔥 EMAIL */}
              <input
                value={form.email || ""}
                onChange={(e)=>setForm({...form, email:e.target.value})}
                placeholder="Novo email"
              />

              {/* 🔥 SENHA */}
              <input
                type="password"
                placeholder="Nova senha"
                value={novaSenha}
                onChange={(e)=>setNovaSenha(e.target.value)}
              />

              <input
                type="password"
                placeholder="Confirmar senha"
                value={confirmarSenha}
                onChange={(e)=>setConfirmarSenha(e.target.value)}
              />

              <button onClick={()=>document.getElementById("perfilInput").click()}>
                Foto Perfil
              </button>

              <input id="perfilInput" type="file" hidden onChange={(e)=>handleImagem(e,"fotoPerfil")}/>

              <button onClick={()=>document.getElementById("capaInput").click()}>
                Foto Capa
              </button>

              <input id="capaInput" type="file" hidden onChange={(e)=>handleImagem(e,"fotoCapa")}/>

              <button onClick={salvar}>Salvar</button>
            </div>
          </div>
        )}

        {/* EDITAR PERFIL IMG */}
        {editandoPerfilImg && (
          <div className="overlay">
            <div className="popup small">

              <h2>Ajustar Foto</h2>

              <div className="preview-perfil" style={{
                backgroundImage: `url(${form.fotoPerfil})`,
                backgroundPosition: `${tempPerfil.x}% ${tempPerfil.y}%`
              }}/>

              <input type="range"
                value={tempPerfil.y}
                onChange={(e)=>setTempPerfil({...tempPerfil, y:e.target.value})}
              />

              <input type="range"
                value={tempPerfil.x}
                onChange={(e)=>setTempPerfil({...tempPerfil, x:e.target.value})}
              />

              <button onClick={aplicarPerfil}>OK</button>
            </div>
          </div>
        )}

        {/* EDITAR CAPA */}
        {editandoCapaImg && (
          <div className="overlay">
            <div className="popup small">

              <h2>Ajustar Capa</h2>

              <div className="preview-capa" style={{
                backgroundImage: `url(${form.fotoCapa})`,
                backgroundPosition: `${tempCapa.x}% ${tempCapa.y}%`
              }}/>

              <input type="range"
                value={tempCapa.y}
                onChange={(e)=>setTempCapa({...tempCapa, y:e.target.value})}
              />

              <input type="range"
                value={tempCapa.x}
                onChange={(e)=>setTempCapa({...tempCapa, x:e.target.value})}
              />

              <button onClick={aplicarCapa}>OK</button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}