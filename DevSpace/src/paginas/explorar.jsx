import { useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import "../style/explorar.css";

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

function userAvatar(handle) {
  return `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(handle)}`;
}

export default function Explorar({ irHome, irPerfil, onOpenPost, onOpenUserProfile }) {
  const [tab, setTab] = useState("momento");
  const [search, setSearch] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(null);

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

  return (
    <div className="home">
      <Sidebar onReload={irHome} irPerfil={irPerfil} irExplorar={() => {}} onOpenPost={onOpenPost} />

      <div className="explore-page">
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

          {!selectedGroup && (
            <div className="explore-groups">
              {filteredGroups.map((group) => (
                <button key={group.id} className="group-card group-clickable" onClick={() => setSelectedGroupId(group.id)}>
                  <h3>{group.title}</h3>
                  <p className="group-subtitle">{group.subtitle}</p>
                  <span className="group-count">{group.posts.length} postagens no grupo</span>
                </button>
              ))}

              {filteredGroups.length === 0 && <p className="explore-empty">Nenhum assunto encontrado.</p>}
            </div>
          )}

          {selectedGroup && (
            <div className="group-detail">
              <button className="group-back" onClick={() => setSelectedGroupId(null)}>← Voltar para grupos</button>
              <h2>{selectedGroup.title}</h2>
              <p className="group-subtitle">{selectedGroup.subtitle}</p>

              <div className="group-feed">
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
