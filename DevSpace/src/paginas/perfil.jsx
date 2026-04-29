import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/perfil.css";
import { createPortal } from "react-dom";

export default function Perfil({ onLogout, irHome, onOpenPost, refreshFeed }) {
  const [usuario, setUsuario] = useState(null);
  const [posts, setPosts] = useState([]);
  const [editando, setEditando] = useState(false);
  const [activeMenuPostId, setActiveMenuPostId] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [editingText, setEditingText] = useState("");

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

  const [reloadImg, setReloadImg] = useState(0);

  useEffect(() => {
    const localUser = JSON.parse(localStorage.getItem("usuarioLogado"));
    const sessionUser = JSON.parse(sessionStorage.getItem("usuarioLogado"));
    const user = localUser || sessionUser;

    if (user) {
      if (!user.criadoEm) user.criadoEm = new Date().toISOString();
      if (!user.handle) user.handle = user.username.replace(/\s+/g, "").toLowerCase();
      if (!user.seguidores) user.seguidores = 0;
      if (!user.seguindo) user.seguindo = [];
      if (!user.comments) user.comments = 0;

      setUsuario(user);
      setForm(user);
      setAvaliacao(user.avaliacao || 0);

      setPosPerfil(user.posPerfil || { x: 50, y: 50 });
      setPosCapa(user.posCapa || { x: 50, y: 50 });
    }
  }, []);

  useEffect(() => {
    if (!usuario) return;

    const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const filtered = savedPosts.filter((post) => {
      return (
        post.email === usuario.email ||
        post.username === usuario.username ||
        post.handle === usuario.handle
      );
    });

    const ordered = filtered.sort(
      (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
    );
    setPosts(ordered);
    setActiveMenuPostId(null);
  }, [usuario, refreshFeed]);

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
    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    let atualizado = { ...usuario };

    // 🔥 FORÇA SUBSTITUIÇÃO TOTAL (não deixa imagem antiga persistir)
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

    const novosUsuarios = usuarios.map((u) =>
      u.email === atualizado.email ? atualizado : u
    );

    localStorage.setItem("usuarios", JSON.stringify(novosUsuarios));
    localStorage.setItem("usuarioLogado", JSON.stringify(atualizado));

    setUsuario(atualizado);

    setReloadImg(Date.now());

    setEditandoImagem(null);
    setPreviewImg(null);
  }

  function salvarPerfil() {
    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    // 🔥 SEMPRE base no estado atual (evita voltar imagem antiga)
    let atualizado = { ...usuario, ...form };

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

    atualizado.fotoPerfil = usuario.fotoPerfil;
    atualizado.fotoCapa = usuario.fotoCapa;

    atualizado.senha = form.novaSenha ? form.novaSenha : usuario.senha;
    atualizado.avaliacao = avaliacao;

    delete atualizado.novaSenha;
    delete atualizado.confirmarSenha;

    usuarios = usuarios.map((u) =>
      u.email === usuario.email ? atualizado : u
    );

    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("usuarioLogado", JSON.stringify(atualizado));

    setUsuario(atualizado);

    setReloadImg(Date.now());

    setPreviewImg(null);
    setEditandoImagem(null);
    setEditando(false);

    setErro("");
    setSucesso("Perfil atualizado!");
  }

  function savePostEdit() {
    if (!editingPost) return;

    const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const updatedPosts = savedPosts.map((post) =>
      post.id === editingPost.id ? { ...post, texto: editingText } : post
    );

    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    setPosts(updatedPosts.filter((post) => post.email === usuario.email || post.username === usuario.username));
    setEditingPost(null);
    setEditingText("");
  }

  function toggleSavePost(post) {
    const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const updatedPosts = savedPosts.map((item) =>
      item.id === post.id ? { ...item, salvo: !item.salvo } : item
    );

    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    setPosts(updatedPosts.filter((p) => p.email === usuario.email || p.username === usuario.username));
    setActiveMenuPostId(null);
  }

  function deletePost(postId) {
    const savedPosts = JSON.parse(localStorage.getItem("posts")) || [];
    const updatedPosts = savedPosts.filter((post) => post.id !== postId);
    localStorage.setItem("posts", JSON.stringify(updatedPosts));
    setPosts(updatedPosts.filter((post) => post.email === usuario.email || post.username === usuario.username));
    setActiveMenuPostId(null);
  }

  function editPost(post) {
    setEditingPost(post);
    setEditingText(post.texto || "");
    setActiveMenuPostId(null);
  }

  function logout() {
    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("lembrarMe");
    sessionStorage.removeItem("usuarioLogado");
    onLogout();
  }

  if (!usuario) return <h1>Carregando...</h1>;

  const isRenan = usuario.email === "renan.kael@gmail.com";
  const starCount = isRenan ? 6 : 5;
  const activeStars = isRenan ? 6 : avaliacao;
  const criadoEm = isRenan ? "26/06/206" : new Date(usuario.criadoEm).toLocaleDateString();

  return (
    <div className="home">
      <Sidebar onReload={irHome} onOpenPost={onOpenPost} />

      <div className="profile-page">

        <div className="topo-perfil">
          <span onClick={irHome}>←</span>
          <h3>{usuario.username}</h3>

          <div className="avaliacao">
            {Array.from({ length: starCount }, (_, index) => {
              const n = index + 1;
              return (
                <span key={n} className={n <= activeStars ? "star ativa" : "star"}>★</span>
              );
            })}
          </div>
        </div>

        <div
          className="capa"
          key={reloadImg}
          style={{
            backgroundImage: usuario.fotoCapa ? `url(${usuario.fotoCapa})` : "none",
            backgroundPosition: `${posCapa.x}% ${posCapa.y}%`
          }}
        />

        <div className="perfil-header">
          <div
            className="foto"
            key={reloadImg + "perfil"}
            style={{
              backgroundImage: usuario.fotoPerfil ? `url(${usuario.fotoPerfil})` : "none",
              backgroundPosition: `${posPerfil.x}% ${posPerfil.y}%`
            }}
          />

          <div className="stats">
            <span><b>{usuario.seguindo?.length || 0}</b> Seguindo</span>
            <span><b>{usuario.seguidores || 0}</b> Seguidores</span>
            <span><b>{posts.length}</b> Posts</span>
            <span><b>{usuario.projetos?.length || 0}</b> Projetos</span>
          </div>

          <button className="btn-editar" onClick={() => setEditando(true)}>
            Editar Perfil
          </button>
        </div>

        <div className="info">
          <h2>{usuario.username}</h2>
          <span>@{usuario.handle || usuario.username}</span>

          <p className="bio">{usuario.bio || "Sem bio..."}</p>

          <p className="data">
            📅 Criado em: {criadoEm}
          </p>
        </div>

        <div className="posts-container">
          <h3>Posts</h3>
          <div className="posts-list">
            {posts.length === 0 ? (
              <div className="perfil-post-empty">Sem posts ainda.</div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="perfil-post-card">
                  <div className="perfil-post-avatar-card" style={{
                    backgroundImage: post.fotoPerfil ? `url(${post.fotoPerfil})` : "none",
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }} />
                  <div className="perfil-post-body">
                    <div className="perfil-post-header-row">
                      <div>
                        <div className="perfil-post-title">{post.username}</div>
                        <div className="perfil-post-handle">@{post.handle || post.username}</div>
                      </div>
                      <button
                        className="perfil-post-options-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id);
                        }}
                      >
                        ⋮
                      </button>
                    </div>
                    <div className="perfil-post-text">{post.texto || "Post sem texto"}</div>
                    {post.salvo && <div className="perfil-post-saved">Salvo</div>}

                    {activeMenuPostId === post.id && (
                      <div className="perfil-post-menu">
                        <button type="button" onClick={() => toggleSavePost(post)}>
                          {post.salvo ? "Desfazer salvar" : "Salvar post"}
                        </button>
                        <button type="button" onClick={() => editPost(post)}>
                          Editar post
                        </button>
                        <button type="button" onClick={() => deletePost(post.id)}>
                          Excluir post
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <button className="logout-bottom" onClick={logout}>
          Sair da conta
        </button>

        {editando && createPortal(
          <div className="overlay">
            <div className="popup">
              <button className="close-btn" onClick={() => setEditando(false)}>✕</button>

              <h2>Editar Perfil</h2>

              <input value={form.username || ""} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Nome" />
              <input value={form.handle || ""} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="@handle" />
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

        {editingPost && createPortal(
          <div className="overlay">
            <div className="popup">
              <button className="close-btn" onClick={() => setEditingPost(null)}>✕</button>
              <h2>Editar Post</h2>
              <textarea
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                placeholder="Atualize o texto do post"
                rows={6}
                style={{ background: '#222', color: '#fff', borderRadius: '10px', padding: '12px', border: '1px solid #333' }}
              />
              <div className="popup-btns">
                <button onClick={savePostEdit}>Salvar</button>
                <button onClick={() => setEditingPost(null)}>Cancelar</button>
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

              <label>Horizontal</label>
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

              <label>Vertical</label>
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