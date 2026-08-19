import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/explorar.css";
import { useSidebarOpen } from "../hooks/useSidebarOpen";
import { createPost, fetchPosts, fetchUsers } from "../api";
import PageHeader from "../components/PageHeader";
import { placeholderAvatarUri, usableFotoPerfil } from "../utils/avatar";

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

const LANG_GROUP_HINTS = {
  typescript: ["web", "ia"],
  python: ["ia", "backend"],
  go: ["backend"],
  rust: ["backend"],
  javascript: ["web", "mobile"],
};

const KNOWN_PROFILES = [
  { username: "Xande7", handle: "xande7", email: "xande7@devspace.fake", bio: "Perfil da comunidade DevSpace." },
];

function userAvatar(handle) {
  return placeholderAvatarUri(handle || "usuario");
}

function normalizeHandle(value) {
  return String(value || "").replace(/^@+/, "").replace(/\s+/g, "").toLowerCase().trim();
}

function fakeCover(handle) {
  return `https://picsum.photos/seed/${encodeURIComponent((handle || "usuario") + "-explore")}/900/260`;
}

const FAKE_TIME_LABELS = ["há 1h", "há 2h", "há 3h", "há 5h", "há 8h", "ontem", "há 2 dias"];

// Deriva numeros "aleatorios" estaveis a partir do handle + indice, pra cada
// perfil fake sempre mostrar o mesmo horario/curtidas entre renders.
function fakeStat(seed, mod) {
  const text = String(seed || "");
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % mod;
}

function buildFakeGroupPost(entry, groupId, index) {
  const handle = normalizeHandle(entry.handle);
  return {
    ...entry,
    handle,
    avatar: userAvatar(handle),
    time: FAKE_TIME_LABELS[fakeStat(`${groupId}-${handle}-${index}`, FAKE_TIME_LABELS.length)],
    likes: 3 + fakeStat(`${groupId}-${handle}-likes`, 40),
  };
}

function isLowQualityExploreProfile(profile) {
  const handle = normalizeHandle(profile?.handle || profile?.username);
  const username = String(profile?.username || "").toLowerCase();
  const bio = String(profile?.bio || "").toLowerCase();
  const email = String(profile?.email || "").toLowerCase();
  if (/^(qa|test|sms|guser|telefone|simp)/.test(handle)) return true;
  if (handle.includes("qaloop") || handle.includes("qaui") || handle.includes("qafresh") || handle.includes("testauth")) return true;
  if (username.startsWith("qa ") || username.startsWith("test ") || username === "sms user" || username === "teste auth") return true;
  if (bio.includes("cadastro via api") || bio.includes("bio de teste") || bio === "teste") return true;
  if (email.endsWith("@devspace.local") || email.endsWith("@phone.devspace.local")) return true;
  return false;
}

export default function Explorar({ irHome, irPerfil, irChat, onOpenPost, onOpenUserProfile, logado, onRequireAuth, contactRequests, onAcceptContact, onDeclineContact, unreadConversas, onOpenUnreadConversa, activityNotifications, onOpenActivityNotification, irNotificacoes, irConfiguracoes, blockedUsers = [], onPostSaved }) {
  const [sidebarOpen, setSidebarOpen] = useSidebarOpen();
  const [tab, setTab] = useState("momento");
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [backendPosts, setBackendPosts] = useState([]);
  const [backendUsers, setBackendUsers] = useState([]);
  const [opinionText, setOpinionText] = useState("");
  const [opinionError, setOpinionError] = useState("");
  const [publishingOpinion, setPublishingOpinion] = useState(false);
  const [userTick, setUserTick] = useState(0);

  // currentUser e lido direto do storage a cada render (nao vem de estado);
  // perfil.jsx dispara esse evento na mesma aba ao salvar/corrigir a foto,
  // entao um contador basta pra forcar o re-render que releria o valor novo.
  useEffect(() => {
    const handleUserUpdated = () => setUserTick((n) => n + 1);
    window.addEventListener("devspaceUserUpdated", handleUserUpdated);
    return () => window.removeEventListener("devspaceUserUpdated", handleUserUpdated);
  }, []);

  const currentUser = useMemo(() => {
    return (
      JSON.parse(localStorage.getItem("usuarioLogado") || "null") ||
      JSON.parse(sessionStorage.getItem("usuarioLogado") || "null")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userTick]);

  const blockedHandles = useMemo(
    () => new Set(blockedUsers.map((u) => (u.handle || "").toLowerCase())),
    [blockedUsers]
  );
  const blockedEmails = useMemo(
    () => new Set(blockedUsers.map((u) => (u.email || "").toLowerCase())),
    [blockedUsers]
  );
  function ehBloqueado(entidade) {
    const handle = normalizeHandle(entidade?.handle || entidade?.username);
    const email = String(entidade?.email || "").toLowerCase();
    return (handle && blockedHandles.has(handle)) || (email && blockedEmails.has(email));
  }

  const exploreData = useMemo(() => {
    const posts = (backendPosts.length > 0 ? backendPosts : JSON.parse(localStorage.getItem("posts")) || []).filter(
      (post) => !ehBloqueado(post)
    );
    const savedUsers = (backendUsers.length > 0 ? backendUsers : JSON.parse(localStorage.getItem("usuarios")) || []).filter(
      (user) => !ehBloqueado(user)
    );
    const users = [...(Array.isArray(savedUsers) ? savedUsers : []), ...KNOWN_PROFILES];
    const currentUser =
      JSON.parse(localStorage.getItem("usuarioLogado")) ||
      JSON.parse(sessionStorage.getItem("usuarioLogado"));
    const currentHandle = normalizeHandle(currentUser?.handle || currentUser?.username);
    const following = new Set((Array.isArray(currentUser?.seguindo) ? currentUser.seguindo : []).map(normalizeHandle));

    const recommendedPosts = (Array.isArray(posts) ? posts : [])
      .filter((post) => normalizeHandle(post?.handle || post?.username) !== currentHandle)
      .filter((post) => !isLowQualityExploreProfile(post))
      .sort((a, b) => {
        const scoreA = Number(a.likes || 0) + Number(a.comments || 0) + Number(a.shares || 0);
        const scoreB = Number(b.likes || 0) + Number(b.comments || 0) + Number(b.shares || 0);
        return scoreB - scoreA || new Date(b.criadoEm || 0).getTime() - new Date(a.criadoEm || 0).getTime();
      })
      .slice(0, 6);

    const recommendedProfiles = (Array.isArray(users) ? users : [])
      .filter((user) => {
        const handle = normalizeHandle(user?.handle || user?.username);
        return handle && handle !== currentHandle && !following.has(handle) && !isLowQualityExploreProfile(user);
      })
      .slice(0, 6);

    return {
      posts: recommendedPosts,
      profiles: recommendedProfiles,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, blockedHandles, blockedEmails, backendPosts, backendUsers]);

  const filteredProfiles = useMemo(() => {
    const q = normalizeHandle(search);
    if (!q) return [];

    const savedUsers = backendUsers.length > 0 ? backendUsers : JSON.parse(localStorage.getItem("usuarios")) || [];
    const postAuthors = (backendPosts.length > 0 ? backendPosts : JSON.parse(localStorage.getItem("posts")) || []).map((post) => ({
      username: post.username,
      handle: post.handle || post.username,
      email: post.email,
      bio: post.bio,
      fotoPerfil: post.fotoPerfil,
      fotoCapa: post.fotoCapa,
    }));
    const profiles = [...(Array.isArray(savedUsers) ? savedUsers : []), ...postAuthors, ...KNOWN_PROFILES].filter(
      (profile) => !ehBloqueado(profile)
    );
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
          fotoPerfil: usableFotoPerfil(profile.fotoPerfil) || userAvatar(handle),
          fotoCapa: profile.fotoCapa || fakeCover(handle),
        });
      }
    });

    return [...deduped.values()].slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, blockedHandles, blockedEmails, backendPosts, backendUsers]);

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return GROUPS;
    const hinted = LANG_GROUP_HINTS[q] || [];
    return GROUPS.filter((group) => {
      if (hinted.includes(group.id)) return true;
      if (group.title.toLowerCase().includes(q) || group.subtitle.toLowerCase().includes(q)) return true;
      return group.posts.some(
        (post) =>
          post.user.toLowerCase().includes(q) ||
          post.handle.toLowerCase().includes(q) ||
          post.text.toLowerCase().includes(q)
      );
    });
  }, [search]);

  useEffect(() => {
    let canceled = false;

    async function loadBackendData() {
      try {
        const [postsData, usersData] = await Promise.all([fetchPosts(), fetchUsers()]);
        if (canceled) return;

        setBackendPosts(Array.isArray(postsData) ? postsData : []);
        setBackendUsers(Array.isArray(usersData) ? usersData : []);
      } catch (error) {
        console.warn("Erro ao carregar explorar do backend:", error);
      }
    }

    loadBackendData();
    return () => {
      canceled = true;
    };
  }, []);

  const selectedGroup = GROUPS.find((g) => g.id === selectedGroupId) || null;

  const taggedRealPosts = useMemo(() => {
    if (!selectedGroupId) return [];
    const posts = backendPosts.length > 0 ? backendPosts : JSON.parse(localStorage.getItem("posts")) || [];
    return (Array.isArray(posts) ? posts : [])
      .filter((post) => post?.tag === selectedGroupId && post?.texto && !ehBloqueado(post))
      .sort((a, b) => new Date(b.criadoEm || 0).getTime() - new Date(a.criadoEm || 0).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroupId, blockedHandles, blockedEmails, backendPosts]);

  function contarPostsDoGrupo(groupId) {
    return (backendPosts.length > 0 ? backendPosts : JSON.parse(localStorage.getItem("posts")) || [])
      .filter((post) => post?.tag === groupId && post?.texto && !ehBloqueado(post)).length;
  }

  async function handlePublicarOpiniao() {
    if (!logado) {
      onRequireAuth?.("Entre na sua conta para publicar sua opinião.");
      return;
    }
    const texto = opinionText.trim();
    if (!texto) {
      setOpinionError("Escreva algo para publicar.");
      return;
    }
    if (publishingOpinion || !selectedGroupId) return;

    setPublishingOpinion(true);
    setOpinionError("");
    try {
      const novoPost = {
        username: currentUser?.username || "Usuário",
        handle: normalizeHandle(currentUser?.handle || currentUser?.username || "usuario"),
        email: currentUser?.email || "",
        fotoPerfil: currentUser?.fotoPerfil || "",
        texto,
        imagem: "",
        anexo: null,
        poll: null,
        tag: selectedGroupId,
        agendadoPara: "",
        criadoEm: new Date().toISOString(),
        comments: 0,
        commentsList: [],
        isSeedFake: false,
        shares: 0,
        likes: 0,
        bookmarks: 0,
        likedBy: [],
        savedBy: [],
        repostedBy: [],
      };

      const createdPost = await createPost(novoPost);
      onPostSaved?.(createdPost);
      setBackendPosts((prev) => [createdPost, ...prev]);
      setOpinionText("");
    } catch (error) {
      setOpinionError(error.message || "Não foi possível publicar sua opinião agora.");
    } finally {
      setPublishingOpinion(false);
    }
  }

  return (
    <div className="home">
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        onReload={irHome}
        irPerfil={irPerfil}
        irExplorar={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        irChat={irChat}
        onOpenPost={onOpenPost}
        logado={logado}
        onRequireAuth={onRequireAuth}
        contactRequests={contactRequests}
        onAcceptContact={onAcceptContact}
        onDeclineContact={onDeclineContact}
        unreadConversas={unreadConversas}
        onOpenUnreadConversa={onOpenUnreadConversa}
        activityNotifications={activityNotifications}
        onOpenActivityNotification={onOpenActivityNotification}
        irNotificacoes={irNotificacoes}
        irConfiguracoes={irConfiguracoes}
      />

      <div id="conteudo-principal" className={`explore-page${sidebarOpen ? "" : " sidebar-closed"}`}>
        <div className="ds-shell ds-content-grid explore-shell">
        <div className="explore-main">
          <div className="explore-top">
            <input
              type="text"
              placeholder="Buscar assuntos, linguagens ou @usuários"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <PageHeader eyebrow="Descobrir" title="Explorar" description="Encontre assuntos, pessoas e tecnologias." />

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
                          style={{ backgroundImage: `url("${profile.fotoCapa || fakeCover(profile.handle)}")` }}
                        />
                        <div className="profile-mini-body">
                          <span
                            className="profile-mini-avatar"
                            style={{ backgroundImage: `url("${usableFotoPerfil(profile.fotoPerfil) || userAvatar(profile.handle)}")` }}
                          />
                          <strong>{profile.username || "Usuário"}</strong>
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
                  <span className="group-count">{contarPostsDoGrupo(group.id)} {contarPostsDoGrupo(group.id) === 1 ? "postagem" : "postagens"} no grupo</span>
                </button>
              ))}

              {filteredGroups.length === 0 && filteredProfiles.length === 0 && (
                <div className="explore-empty-card">
                  <strong>Nenhum resultado encontrado</strong>
                  <p>Tente outro @, linguagem ou assunto.</p>
                  {search.trim() && (
                    <button type="button" onClick={() => setSearch("")}>
                      Limpar busca
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "momento" && selectedGroup && (
            <div className="group-detail">
              <button className="group-back" onClick={() => setSelectedGroupId(null)}>← Voltar para grupos</button>
              <h2>{selectedGroup.title}</h2>
              <p className="group-subtitle">{selectedGroup.subtitle}</p>

              <div className="opinion-composer">
                <span
                  className="group-post-avatar"
                  style={{
                    backgroundImage: `url("${usableFotoPerfil(currentUser?.fotoPerfil) || userAvatar(currentUser?.handle || currentUser?.username || "voce")}")`,
                  }}
                />
                <div className="opinion-composer-body">
                  <textarea
                    placeholder={`O que você pensa sobre ${selectedGroup.title.toLowerCase()}?`}
                    value={opinionText}
                    onChange={(e) => {
                      setOpinionText(e.target.value);
                      if (opinionError) setOpinionError("");
                    }}
                    rows={2}
                  />
                  {opinionError && <p className="opinion-composer-error">{opinionError}</p>}
                  <div className="opinion-composer-actions">
                    <button
                      type="button"
                      disabled={publishingOpinion || !opinionText.trim()}
                      onClick={handlePublicarOpiniao}
                    >
                      {publishingOpinion ? "Publicando..." : "Publicar opinião"}
                    </button>
                  </div>
                </div>
              </div>

              <h3 className="group-feed-subhead">Opiniões da comunidade</h3>
              <div className="group-feed">
                {taggedRealPosts.map((post) => (
                  <article key={`real-${post.id}`} className="group-feed-post">
                    <div className="group-feed-head">
                      <div
                        className="group-feed-avatar"
                        style={{ backgroundImage: `url("${usableFotoPerfil(post.fotoPerfil) || userAvatar(post.handle || post.username)}")` }}
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
                {taggedRealPosts.length === 0 && (
                  <div className="explore-empty-card">
                    <strong>Ainda sem opiniões publicadas</strong>
                    <p>Seja a primeira pessoa a comentar sobre este assunto.</p>
                  </div>
                )}
              </div>

              <h3 className="group-feed-subhead">Comentários em destaque</h3>
              <div className="group-posts">
                {selectedGroup.posts.map((entry, index) => {
                  const fake = buildFakeGroupPost(entry, selectedGroup.id, index);
                  return (
                    <article key={`fake-${fake.handle}-${index}`} className="group-post">
                      <div className="group-post-head">
                        <span className="group-post-avatar" style={{ backgroundImage: `url("${fake.avatar}")` }} />
                        <div className="group-post-head-text">
                          <button
                            className="group-post-user"
                            onClick={() => onOpenUserProfile?.({ username: fake.user, handle: fake.handle })}
                          >
                            {fake.user} <span>@{fake.handle}</span>
                          </button>
                          <span className="group-post-time">{fake.time}</span>
                        </div>
                      </div>
                      <p>{fake.text}</p>
                      <span className="group-post-likes">💬 {fake.likes} pessoas comentaram algo parecido</span>
                    </article>
                  );
                })}
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
                  {exploreData.posts.length === 0 && (
                    <div className="explore-empty-card">
                      <strong>Sem recomendações ainda</strong>
                      <p>Explore um assunto ou publique algo para alimentar este espaço.</p>
                    </div>
                  )}
                  {exploreData.posts.map((post, index) => {
                    const handle = normalizeHandle(post.handle || post.username || post.user);
                    const user = post.username || post.user || "Usuário";
                    return (
                      <article key={post.id || `${handle}-${index}`} className="for-you-post">
                        <button
                          type="button"
                          className="for-you-avatar"
                          style={{ backgroundImage: `url("${usableFotoPerfil(post.fotoPerfil) || userAvatar(handle)}")` }}
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
                          <small>
                            {post.group
                              ? post.group
                              : `${post.likes || 0} ${(post.likes || 0) === 1 ? "curtida" : "curtidas"} • ${post.comments || 0} ${(post.comments || 0) === 1 ? "comentário" : "comentários"}`}
                          </small>
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
                          style={{ backgroundImage: `url("${profile.fotoCapa || fakeCover(handle)}")` }}
                        />
                        <div className="profile-mini-body">
                          <span
                            className="profile-mini-avatar"
                            style={{ backgroundImage: `url("${usableFotoPerfil(profile.fotoPerfil) || userAvatar(handle)}")` }}
                          />
                          <strong>{profile.username || "Usuário"}</strong>
                          <small>@{handle}</small>
                          <p>{profile.bio || "Perfil da comunidade DevSpace."}</p>
                        </div>
                      </button>
                    );
                  })}
                  {exploreData.profiles.length === 0 && (
                    <div className="explore-empty-card">
                      <strong>Você já está bem conectado</strong>
                      <p>Os principais perfis sugeridos por aqui já estão no seu radar.</p>
                    </div>
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
                      <span>{contarPostsDoGrupo(group.id)} {contarPostsDoGrupo(group.id) === 1 ? "conversa" : "conversas"}</span>
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
            <button
              type="button"
              key={lang}
              className="trend-item"
              onClick={() => {
                setSearch(lang);
                setTab("momento");
                setSelectedGroupId(null);
              }}
            >
              <span>{index + 1}.</span>
              <strong>{lang}</strong>
            </button>
          ))}
        </aside>
        </div>
      </div>
    </div>
  );
}
