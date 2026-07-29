import { useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/explorar.css";
import { useSidebarOpen } from "../hooks/useSidebarOpen";

const GROUPS = [
  {
    id: "ia",
    title: "IA na programação",
    subtitle: "uso de inteligência artificial para gerar código e automatizar tarefas",
    posts: [
      { user: "Lia Gomes", handle: "liagomes", text: "Usei LLM para gerar testes unitários e reduzi 40% do tempo de revisão." },
      { user: "Carlos Devs", handle: "carlosdevs", text: "Prompt + lint + testes locais virou meu fluxo padrão no backend." },
      { user: "Ana Tech", handle: "anatech", text: "Montei snippets com IA para tarefas repetitivas e ficou muito mais rápido." },
    ],
  },
  {
    id: "web",
    title: "Desenvolvimento web moderno",
    subtitle: "tecnologias atuais para criação de sites rápidos e interativos",
    posts: [
      { user: "Bruna UX", handle: "brunaux", text: "Microinterações bem feitas deixam navegação muito mais clara." },
      { user: "Vitor Front", handle: "vitorfront", text: "Dividi bundles e o LCP caiu de 3.2s para 1.8s." },
      { user: "Nina Correa", handle: "ninacorrea", text: "Design tokens ajudaram a manter consistência em todo o app." },
    ],
  },
  {
    id: "backend",
    title: "Backend de alta performance",
    subtitle: "foco em servidores mais rápidos e eficientes",
    posts: [
      { user: "Pedro Code", handle: "pedrocode", text: "Cache por camada + índices certos resolveu gargalo de consulta." },
      { user: "Caio Stack", handle: "caiostack", text: "Fila assíncrona para tarefas pesadas deixou API estável no pico." },
      { user: "Arthur Silva", handle: "arthursilva", text: "Ajustei pool de conexões e derrubei latência média em produção." },
    ],
  },
  {
    id: "cloud",
    title: "Cloud computing e DevOps",
    subtitle: "armazenamento em nuvem e automação de processos de desenvolvimento",
    posts: [
      { user: "Arthur Silva", handle: "arthursilva", text: "Pipeline com preview por PR acelerou validação de layout." },
      { user: "Duda Product", handle: "dudaproduct", text: "Observabilidade no começo evitou retrabalho no suporte." },
      { user: "Felipe Rocha", handle: "feliperocha", text: "Infra como código deixou onboarding do time muito mais simples." },
    ],
  },
  {
    id: "mobile",
    title: "Desenvolvimento mobile",
    subtitle: "criação de aplicativos para celulares",
    posts: [
      { user: "Ana Tech", handle: "anatech", text: "Offline-first melhorou muito experiência em conexões instáveis." },
      { user: "Felipe Rocha", handle: "feliperocha", text: "Otimizei imagens e o app ficou bem mais leve no Android." },
      { user: "Maria Silva", handle: "mariasilva", text: "Troca para componentes nativos reduziu o consumo de bateria." },
    ],
  },
];

const HOT_LANGS = ["TypeScript", "Python", "Go", "Rust", "JavaScript"];

const KNOWN_PROFILES = [
  { username: "Xande7", handle: "xande7", email: "xande7@devspace.fake", bio: "Perfil da comunidade DevSpace." },
];

function userAvatar(handle) {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(handle)}`;
}

function normalizeHandle(value) {
  return String(value || "").replace(/^@+/, "").replace(/\s+/g, "").toLowerCase().trim();
}

function fakeCover(handle) {
  return `https://picsum.photos/seed/${encodeURIComponent((handle || "usuario") + "-explore")}/900/260`;
}

function groupPostsAsRecommendations() {
  return GROUPS.flatMap((group) =>
    group.posts.map((post) => ({
      ...post,
      group: group.title,
      reason: group.subtitle,
    }))
  );
}

export default function Explorar({ irHome, irPerfil, irChat, onOpenPost, onOpenUserProfile, logado, onRequireAuth }) {
  const [sidebarOpen, setSidebarOpen] = useSidebarOpen();
  const [tab, setTab] = useState("momento");
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const exploreData = useMemo(() => {
    const posts = JSON.parse(localStorage.getItem("posts")) || [];
    const savedUsers = JSON.parse(localStorage.getItem("usuarios")) || [];
    const users = [...(Array.isArray(savedUsers) ? savedUsers : []), ...KNOWN_PROFILES];
    const currentUser =
      JSON.parse(localStorage.getItem("usuarioLogado")) ||
      JSON.parse(sessionStorage.getItem("usuarioLogado"));
    const currentHandle = normalizeHandle(currentUser?.handle || currentUser?.username);
    const following = new Set((Array.isArray(currentUser?.seguindo) ? currentUser.seguindo : []).map(normalizeHandle));

    const recommendedPosts = (Array.isArray(posts) ? posts : [])
      .filter((post) => normalizeHandle(post?.handle || post?.username) !== currentHandle)
      .sort((a, b) => {
        const scoreA = Number(a.likes || 0) + Number(a.comments || 0) + Number(a.shares || 0);
        const scoreB = Number(b.likes || 0) + Number(b.comments || 0) + Number(b.shares || 0);
        return scoreB - scoreA || new Date(b.criadoEm || 0).getTime() - new Date(a.criadoEm || 0).getTime();
      })
      .slice(0, 6);

    const fallbackPosts = groupPostsAsRecommendations().slice(0, 6);
    const recommendedProfiles = (Array.isArray(users) ? users : [])
      .filter((user) => {
        const handle = normalizeHandle(user?.handle || user?.username);
        return handle && handle !== currentHandle && !following.has(handle);
      })
      .slice(0, 6);

    return {
      posts: recommendedPosts.length > 0 ? recommendedPosts : fallbackPosts,
      profiles: recommendedProfiles,
    };
  }, [tab]);

  const filteredProfiles = useMemo(() => {
    const q = normalizeHandle(search);
    if (!q) return [];

    const savedUsers = JSON.parse(localStorage.getItem("usuarios")) || [];
    const postAuthors = (JSON.parse(localStorage.getItem("posts")) || []).map((post) => ({
      username: post.username,
      handle: post.handle || post.username,
      email: post.email,
      bio: post.bio,
      fotoPerfil: post.fotoPerfil,
      fotoCapa: post.fotoCapa,
    }));
    const profiles = [...(Array.isArray(savedUsers) ? savedUsers : []), ...postAuthors, ...KNOWN_PROFILES];
    const deduped = new Map();

    profiles.forEach((profile) => {
      const handle = normalizeHandle(profile?.handle || profile?.username);
      const username = String(profile?.username || "").toLowerCase();
      if (!handle && !username) return;
      if (!handle.includes(q) && !username.includes(q)) return;
      if (!deduped.has(handle)) {
        deduped.set(handle, {
          ...profile,
          handle,
          fotoPerfil: profile.fotoPerfil || userAvatar(handle),
          fotoCapa: profile.fotoCapa || fakeCover(handle),
        });
      }
    });

    return [...deduped.values()].slice(0, 12);
  }, [search]);

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return GROUPS;
    return GROUPS.filter((group) => {
      if (group.title.toLowerCase().includes(q) || group.subtitle.toLowerCase().includes(q)) return true;
      return group.posts.some(
        (post) =>
          post.user.toLowerCase().includes(q) ||
          post.handle.toLowerCase().includes(q) ||
          post.text.toLowerCase().includes(q)
      );
    });
  }, [search]);

  const selectedGroup = GROUPS.find((g) => g.id === selectedGroupId) || null;

  const taggedRealPosts = useMemo(() => {
    if (!selectedGroupId) return [];
    const posts = JSON.parse(localStorage.getItem("posts")) || [];
    return (Array.isArray(posts) ? posts : [])
      .filter((post) => post?.tag === selectedGroupId && post?.texto)
      .sort((a, b) => new Date(b.criadoEm || 0).getTime() - new Date(a.criadoEm || 0).getTime());
  }, [selectedGroupId]);

  return (
    <div className="home">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        onReload={irHome}
        irPerfil={irPerfil}
        irExplorar={() => {}}
        irChat={irChat}
        onOpenPost={onOpenPost}
        logado={logado}
        onRequireAuth={onRequireAuth}
      />

      <div className={`explore-page${sidebarOpen ? "" : " sidebar-closed"}`}>
        <div className="explore-main">
          <div className="explore-top">
            <input
              type="text"
              placeholder="Buscar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="explore-tabs">
            <button className={tab === "momento" ? "active" : ""} onClick={() => setTab("momento")}>Assuntos do Momento</button>
            <button className={tab === "foryou" ? "active" : ""} onClick={() => setTab("foryou")}>Para Você</button>
          </div>

          {tab === "momento" && !selectedGroup && (
            <div className="explore-groups">
              {filteredProfiles.length > 0 && (
                <div className="explore-profile-results">
                  <h3>Perfis encontrados</h3>
                  <div className="for-you-profiles">
                    {filteredProfiles.map((profile) => (
                      <button
                        type="button"
                        key={profile.email || profile.handle}
                        className="profile-mini-card"
                        onClick={() => onOpenUserProfile?.(profile)}
                      >
                        <div
                          className="profile-mini-cover"
                          style={{ backgroundImage: `url(${profile.fotoCapa || fakeCover(profile.handle)})` }}
                        />
                        <div className="profile-mini-body">
                          <span
                            className="profile-mini-avatar"
                            style={{ backgroundImage: `url(${profile.fotoPerfil || userAvatar(profile.handle)})` }}
                          />
                          <strong>{profile.username || "Usuario"}</strong>
                          <small>@{profile.handle}</small>
                          <p>{profile.bio || "Perfil da comunidade DevSpace."}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredGroups.map((group) => (
                <button key={group.id} className="group-card group-clickable" onClick={() => setSelectedGroupId(group.id)}>
                  <h3>{group.title}</h3>
                  <p className="group-subtitle">{group.subtitle}</p>
                  <span className="group-count">{group.posts.length} postagens no grupo</span>
                </button>
              ))}

              {filteredGroups.length === 0 && filteredProfiles.length === 0 && <p className="explore-empty">Nenhum assunto ou perfil encontrado.</p>}
            </div>
          )}

          {tab === "momento" && selectedGroup && (
            <div className="group-detail">
              <button className="group-back" onClick={() => setSelectedGroupId(null)}>← Voltar para grupos</button>
              <h2>{selectedGroup.title}</h2>
              <p className="group-subtitle">{selectedGroup.subtitle}</p>

              <div className="group-feed">
                {taggedRealPosts.map((post) => (
                  <article key={`real-${post.id}`} className="group-feed-post">
                    <div className="group-feed-head">
                      <div
                        className="group-feed-avatar"
                        style={{ backgroundImage: `url(${post.fotoPerfil || userAvatar(post.handle || post.username)})` }}
                      />
                      <button
                        className="group-post-user"
                        onClick={() => onOpenUserProfile?.({ username: post.username, handle: post.handle, email: post.email })}
                      >
                        {post.username} <span>@{post.handle || post.username}</span>
                      </button>
                    </div>
                    <p>{post.texto}</p>
                  </article>
                ))}
                {selectedGroup.posts.map((post, idx) => (
                  <article key={`${selectedGroup.id}-${idx}`} className="group-feed-post">
                    <div className="group-feed-head">
                      <div
                        className="group-feed-avatar"
                        style={{ backgroundImage: `url(${userAvatar(post.handle)})` }}
                      />
                      <button
                        className="group-post-user"
                        onClick={() => onOpenUserProfile?.({ username: post.user, handle: post.handle })}
                      >
                        {post.user} <span>@{post.handle}</span>
                      </button>
                    </div>
                    <p>{post.text}</p>
                  </article>
                ))}
              </div>
            </div>
          )}

          {tab === "foryou" && (
            <div className="for-you-panel">
              <section className="for-you-section">
                <div className="section-head">
                  <h2>Posts escolhidos para você</h2>
                  <span>baseado no que está movimentando o DevSpace</span>
                </div>

                <div className="for-you-feed">
                  {exploreData.posts.map((post, index) => {
                    const handle = normalizeHandle(post.handle || post.username || post.user);
                    const user = post.username || post.user || "Usuario";
                    return (
                      <article key={post.id || `${handle}-${index}`} className="for-you-post">
                        <button
                          type="button"
                          className="for-you-avatar"
                          style={{ backgroundImage: `url(${post.fotoPerfil || userAvatar(handle)})` }}
                          onClick={() => onOpenUserProfile?.({ username: user, handle, email: post.email })}
                          aria-label={`Abrir perfil de ${user}`}
                        />
                        <div className="for-you-post-body">
                          <button
                            type="button"
                            className="for-you-user"
                            onClick={() => onOpenUserProfile?.({ username: user, handle, email: post.email })}
                          >
                            {user} <span>@{handle}</span>
                          </button>
                          <p>{post.texto || post.text}</p>
                          <small>{post.group ? post.group : `${post.likes || 0} curtidas • ${post.comments || 0} comentários`}</small>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <section className="for-you-section">
                <div className="section-head">
                  <h2>Perfis para conhecer</h2>
                  <span>pessoas fora da sua bolha atual</span>
                </div>

                <div className="for-you-profiles">
                  {exploreData.profiles.map((profile) => {
                    const handle = normalizeHandle(profile.handle || profile.username);
                    return (
                      <button
                        type="button"
                        key={profile.email || handle}
                        className="profile-mini-card"
                        onClick={() => onOpenUserProfile?.(profile)}
                      >
                        <div
                          className="profile-mini-cover"
                          style={{ backgroundImage: `url(${profile.fotoCapa || fakeCover(handle)})` }}
                        />
                        <div className="profile-mini-body">
                          <span
                            className="profile-mini-avatar"
                            style={{ backgroundImage: `url(${profile.fotoPerfil || userAvatar(handle)})` }}
                          />
                          <strong>{profile.username || "Usuario"}</strong>
                          <small>@{handle}</small>
                          <p>{profile.bio || "Perfil da comunidade DevSpace."}</p>
                        </div>
                      </button>
                    );
                  })}
                  {exploreData.profiles.length === 0 && (
                    <p className="explore-empty">Você já segue os principais perfis sugeridos por aqui.</p>
                  )}
                </div>
              </section>

              <section className="for-you-section">
                <div className="section-head">
                  <h2>Tópicos para explorar</h2>
                  <span>atalhos para conversas com mais contexto</span>
                </div>

                <div className="topic-strip">
                  {GROUPS.map((group) => (
                    <button
                      type="button"
                      key={group.id}
                      className="topic-chip"
                      onClick={() => {
                        setTab("momento");
                        setSelectedGroupId(group.id);
                      }}
                    >
                      <strong>{group.title}</strong>
                      <span>{group.posts.length} conversas</span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        <aside className="explore-right">
          <h4>Linguagens em Alta 🔥</h4>
          {HOT_LANGS.map((lang, index) => (
            <div key={lang} className="trend-item">
              <span>{index + 1}-</span>
              <strong>{lang}</strong>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
