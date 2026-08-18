// Seed DEV only. Não use em produção.
// Idempotente: usuários @seed.devspace.local são reutilizados; posts seed são recriados.
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import { dbConfig } from "./loadEnv.js";

const SEED_PASSWORD = "devspace123";
const SEED_DOMAIN = "@seed.devspace.local";

// Mockup de screenshot pra posts com imagem: um retangulo colorido com
// titulo, gerado na hora (sem depender de nenhum arquivo/rede externa).
function mockImage(seed, titulo) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  const c1 = `hsl(${hue} 55% 28%)`;
  const c2 = `hsl(${(hue + 40) % 360} 55% 14%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><rect x="24" y="24" width="592" height="312" rx="12" fill="rgba(255,255,255,0.06)"/><text x="48" y="190" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#ffffff">${titulo}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const USERS = [
  { username: "ana.codes", nome: "Ana Codes", bio: "Frontend React + acessibilidade. Curto CSS bem feito e PRs pequenos.", stack: "React, TypeScript", linguagem: "TypeScript", hire: 1 },
  { username: "bruno.api", nome: "Bruno API", bio: "Backend Node e PostgreSQL. Tentando não reinventar o monólito.", stack: "Node, PostgreSQL", linguagem: "JavaScript", hire: 1 },
  { username: "carla.mobile", nome: "Carla Mobile", bio: "React Native e performance em listas. Offline-first quando dá.", stack: "React Native", linguagem: "TypeScript", hire: 0 },
  { username: "diego.ux", nome: "Diego UX", bio: "Design de produto para devs. Menos neon, mais clareza.", stack: "Figma, Design Systems", linguagem: "CSS", hire: 1 },
  { username: "elena.ops", nome: "Elena Ops", bio: "DevOps, CI e noites sem pager. Terraform é meu hobby duvidoso.", stack: "Docker, Kubernetes", linguagem: "Go", hire: 0 },
  { username: "felipe.data", nome: "Felipe Data", bio: "SQL, dbt e pipelines que não quebram sexta à noite.", stack: "Python, SQL", linguagem: "Python", hire: 1 },
  { username: "gabi.ia", nome: "Gabi IA", bio: "LLMs na prática: embeddings, evals e prompts sem mágica.", stack: "Python, pgvector", linguagem: "Python", hire: 1 },
  { username: "hugo.java", nome: "Hugo Java", bio: "Spring Boot, testes e APIs que explicam o erro.", stack: "Java, Spring", linguagem: "Java", hire: 0 },
  { username: "iris.sql", nome: "Iris SQL", bio: "Modelagem relacional, índices e queries que cabem no EXPLAIN.", stack: "MySQL, PostgreSQL", linguagem: "SQL", hire: 0 },
  { username: "joao.rn", nome: "João RN", bio: "Apps nativos com RN. Gestos, deep links e store review.", stack: "React Native, Expo", linguagem: "TypeScript", hire: 1 },
  { username: "kira.ts", nome: "Kira TS", bio: "Tipos que documentam. Zod + tRPC quando faz sentido.", stack: "TypeScript, Vite", linguagem: "TypeScript", hire: 0 },
  { username: "leo.security", nome: "Leo Security", bio: "Auth, XSS e o clássico: nunca confie no client.", stack: "OAuth, OWASP", linguagem: "JavaScript", hire: 1 },
  { username: "marina.game", nome: "Marina Game", bio: "Gameplay em Unity e Godot. Física, input e juice.", stack: "Unity, C#", linguagem: "C#", hire: 1 },
  { username: "nico.cloud", nome: "Nico Cloud", bio: "AWS, observabilidade e contas que não explodem no fim do mês.", stack: "AWS, Terraform", linguagem: "Go", hire: 1 },
  { username: "otavio.ml", nome: "Otávio ML", bio: "Modelos tabulares, feature stores e deploy sem drama.", stack: "PyTorch, sklearn", linguagem: "Python", hire: 0 },
  { username: "paula.design", nome: "Paula Design", bio: "UI para produtos técnicos. Hierarquia, contraste e menos ruído.", stack: "Figma, UI", linguagem: "CSS", hire: 1 },
];

const POSTS = [
  { user: "ana.codes", tag: "React", texto: "Alguém já teve problema com useEffect executando duas vezes no React 18? No Strict Mode o fetch dispara duplicado e eu acabo abortando no cleanup.\n\n```javascript\nuseEffect(() => {\n  const ctrl = new AbortController();\n  loadFeed(ctrl.signal);\n  return () => ctrl.abort();\n}, []);\n```" },
  { user: "bruno.api", tag: "PostgreSQL", texto: "Estou comparando PostgreSQL e MongoDB para esse projeto. Preciso de transações e relatórios, mas também de documentos flexíveis. O que vocês usariam hoje?" },
  { user: "carla.mobile", tag: "React Native", texto: "Terminei hoje a primeira versão do meu app em React Native. Ainda trava um pouco na lista de mensagens, mas publicar na Play Store foi um alívio enorme 🎉\n\n```tsx\n<FlashList\n  data={mensagens}\n  estimatedItemSize={72}\n  renderItem={({ item }) => <Bolha msg={item} />}\n/>\n```" },
  { user: "diego.ux", tag: "CSS", texto: "Montei esse componente e queria sugestões para melhorar acessibilidade. Foco visível, contraste e ordem de tab. O que vocês checariam primeiro?" },
  { user: "elena.ops", tag: "DevOps", texto: "Alguém já trabalhou com FastAPI + Redis em produção? Quero subir barato antes de pensar em Kubernetes." },
  { user: "felipe.data", tag: "SQL", texto: "Meu SELECT está retornando linhas duplicadas. Estou esquecendo alguma coisa nesse JOIN?\n\n```sql\nSELECT u.username, p.conteudo\nFROM usuarios u\nJOIN posts p ON p.usuario_id = u.id\nJOIN comentarios c ON c.post_id = p.id;\n```" },
  { user: "gabi.ia", tag: "IA", texto: "Testei pgvector em uma base pequena e gostei muito do resultado. Alguém já usou HNSW em VPS sem RAM de sobra?" },
  { user: "hugo.java", tag: "Java", texto: "Qual estratégia vocês usam para refresh token? Rotation no Redis ou só JWT de curta duração?\n\n```java\npublic record TokenPair(String accessToken, String refreshToken) {}\n```" },
  { user: "iris.sql", tag: "SQL", texto: "Índice composto `(seguidor_id, seguido_id)` UNIQUE já cobre o lookup inverso? Spoiler: não. Precisa do índice em `seguido_id` também.\n\n```sql\nCREATE UNIQUE INDEX uq_follow ON seguidores (seguidor_id, seguido_id);\nCREATE INDEX idx_follow_alvo ON seguidores (seguido_id);\n```" },
  { user: "joao.rn", tag: "React Native", texto: "Deep link do perfil no Expo Router. Vocês usam scheme por ambiente (dev/stg/prod) ou um só com path diferente?" },
  { user: "kira.ts", tag: "TypeScript", texto: "Esse useMemo realmente vale a pena aqui? O array é pequeno e eu acho que estou só complicando.\n\n```typescript\ntype User = {\n  id: number;\n  name: string;\n};\n\nconst names = users.map((u: User) => u.name);\n```" },
  { user: "leo.security", tag: "Segurança", texto: "Dica rápida: se o usuário cola HTML na bio, isso tem que aparecer como texto. Sanitizar no server, escapar no render." },
  { user: "marina.game", tag: "Game Dev", texto: "Input buffering no Godot 4: estou guardando o último jump por 120ms. Alguém faz coyote time + buffer juntos sem virar spaghetti?" },
  { user: "nico.cloud", tag: "AWS", texto: "RDS vs Aurora pra um app médio. O Aurora “barato” ainda sai caro se o tráfego for irregular. Vocês scale-to-zero de verdade?" },
  { user: "otavio.ml", tag: "Python", texto: "Feature store caseira com Parquet + DuckDB. Para o time de 4 pessoas, parece suficiente. Quando vocês migrariam para algo tipo Feast?" },
  { user: "paula.design", tag: "UI", texto: "Hierarquia visual em dashboards escuros: título, número, tendência. Se tudo grita, nada se lê." },
  { user: "ana.codes", tag: "CSS", texto: "Primeira semana usando Tailwind. Ainda não decidi se gosto 😂\n\n```css\n.hero {\n  display: grid;\n  gap: 16px;\n}\n```" },
  { user: "bruno.api", tag: "Node", texto: "Vocês limitam tentativas de login no próprio app ou só no WAF? Estou entre Redis sliding window e um bucket simples em memória." },
  { user: "carla.mobile", tag: "Carreira", texto: "Consegui meu primeiro emprego como dev! Ainda não acredito. Qual foi o conselho que vocês mais usaram no começo?" },
  { user: "diego.ux", tag: "Produto", texto: "Terminei meu portfólio hoje. Menos cases, mais contexto. Se alguém quiser dar um olho sincero, manda DM." },
  { user: "elena.ops", tag: "DevOps", texto: "Compose + Traefik labels já dá TLS decente. Kubernetes depois, quando o pager realmente justificar." },
  { user: "felipe.data", tag: "Python", texto: "dbt incremental vs full refresh. Tabela pequena full refresh ganha. Tabela grande incremental + unique_key." },
  { user: "gabi.ia", tag: "Python", texto: "Estou estudando embeddings e fiquei com uma dúvida boba: vocês normalizam o vetor antes ou depois de salvar?\n\n```python\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\n\npipe = Pipeline([\n    (\"scale\", StandardScaler()),\n])\n```" },
  { user: "hugo.java", tag: "Java", texto: "DTO vs entidade no Spring: corto o ciclo com records só quando o DTO diverge da tabela.\n\n```java\npublic record UserResponse(Long id, String username, String bio) {}\n```" },
  { user: "iris.sql", tag: "MySQL", texto: "EXPLAIN ANALYZE > feeling. Índice que “parece certo” às vezes nem é usado porque a cardinalidade mente." },
  { user: "joao.rn", tag: "Performance", texto: "Reanimated 3 + worklets na animação de drawer. Se desmontar o ícone no meio da transição, flicker garantido." },
  { user: "kira.ts", tag: "React", texto: "Como vocês evitam dois formulários de perfil divergindo? Pensei em um componente só, usado no modal rápido e na página completa." },
  { user: "leo.security", tag: "Auth", texto: "OAuth Google: se falta só o @handle, não peça senha de novo. O usuário já autenticou no provedor." },
  { user: "marina.game", tag: "C#", texto: "Estou estudando C# e fiquei com uma dúvida sobre ScriptableObject no Unity. Isso aqui faz sentido?\n\n```csharp\nusing UnityEngine;\n\n[CreateAssetMenu(menuName = \"Game/Weapon\")]\npublic class WeaponData : ScriptableObject\n{\n    public int damage;\n    public float fireRate;\n}\n```" },
  { user: "nico.cloud", tag: "Terraform", texto: "State locking no S3 + DynamoDB. Sem isso dois applies simultâneos viram história de terror." },
  { user: "otavio.ml", tag: "Python", texto: "sklearn Pipeline + ColumnTransformer. O modelo em produção tem que receber o mesmo preprocess do notebook.\n\n```python\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.compose import ColumnTransformer\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.ensemble import HistGradientBoostingClassifier\n\npipe = Pipeline([\n    (\"prep\", ColumnTransformer([(\"num\", StandardScaler(), num_cols)])),\n    (\"model\", HistGradientBoostingClassifier()),\n])\n```" },
  { user: "paula.design", tag: "CSS", texto: "Qual notebook vocês usam para programar? Estou entre um de 14\" leve e um de 16\" com tela melhor." },
  { user: "ana.codes", tag: "Carreira", texto: "Hoje finalmente consegui publicar meu primeiro app na Play Store 🎉 Agora começa a parte difícil: usuários reais." },
  { user: "bruno.api", tag: "Chat", texto: "Alguém vai no meetup de backend sexta? Quero trocar ideia sobre filas e retries." },
  { user: "carla.mobile", tag: "UX", texto: "No celular eu desisti do split lista + conversa. Lista primeiro, thread em tela cheia. Vocês fazem igual?" },
  { user: "diego.ux", tag: "UI", texto: "Estou cansado de card com glow. Borda sutil + hover de border parece mais produto e menos landing page." },
  { user: "elena.ops", tag: "CI", texto: "Qual o pipeline mínimo que vocês confiam num repo pequeno? Lint + build já me basta até ter testes de verdade." },
  { user: "felipe.data", tag: "SQL", texto: "Vocês materializam contador de seguidores na tabela do usuário ou fazem COUNT na hora?" },
  { user: "gabi.ia", tag: "IA", texto: "Eval de RAG: mede recall@k no chunk, não só “o modelo respondeu bonito”. Sem métrica o demo mente." },
  { user: "hugo.java", tag: "API", texto: "Como vocês versionam API pública sem `/v1`? Header Accept funciona, mas o time mobile odeia." },
  { user: "iris.sql", tag: "Carreira", texto: "Primeira semana no novo time. Todo mundo fala em dbt e eu ainda estou mapeando as tabelas 😅" },
  { user: "joao.rn", tag: "React Native", texto: "Image `object-fit: cover` com max-height. Crop aleatório na capa corta rosto demais." },
  { user: "kira.ts", tag: "TypeScript", texto: "Union discriminada > boolean `isLoading` + `error` soltos.\n\n```typescript\ntype State =\n  | { status: \"idle\" }\n  | { status: \"loading\" }\n  | { status: \"error\"; message: string }\n  | { status: \"ok\"; data: Post[] };\n```" },
  { user: "leo.security", tag: "OAuth", texto: "Regra simples: hash de senha nunca sai da API. E-mail só no próprio perfil, não no perfil alheio." },
  { user: "marina.game", tag: "Game Dev", texto: "Juice: hit-stop de 40ms + screen shake leve. Sem isso o golpe parece de papel." },
  { user: "nico.cloud", tag: "Carreira", texto: "Alguém indo para o DevOps Day? Quero montar um grupo pra ir junto." },
  { user: "otavio.ml", tag: "Data Science", texto: "Notebook com `%autoreload` e side-effect no import é armadilha clássica. O gráfico “atualiza sozinho” e ninguém sabe por quê." },
  { user: "paula.design", tag: "UI", texto: "Empty state que eu gosto: título curto, uma linha de contexto, um botão. Sem mascote piscando." },
];

// Posts extras focados em cobrir as funcionalidades que o array POSTS acima
// nao usa: imagem, enquete, agendamento (post futuro fica oculto) e mencao.
const POSTS_FEATURES = [
  { user: "diego.ux", tag: "UI", texto: "Antes/depois do redesign do dashboard. Mais respiro, menos borda.", imagem: "Dashboard v2 — antes/depois" },
  { user: "marina.game", tag: "Game Dev", texto: "Print do nível novo rodando no editor. Ainda falta iluminação.", imagem: "Level_03.unity — editor" },
  { user: "carla.mobile", tag: "React Native", texto: "Tela de onboarding do app, versão 3. Reduzi de 5 telas pra 3.", imagem: "Onboarding v3 — 3 telas" },
  { user: "nico.cloud", tag: "AWS", texto: "Gráfico de custo mensal depois de migrar pra Aurora Serverless.", imagem: "Custo AWS — antes/depois" },
  { user: "otavio.ml", tag: "Data Science", texto: "Matriz de confusão do modelo novo. Melhorou bastante o recall.", imagem: "Confusion Matrix — v2" },
  { user: "bruno.api", tag: "Node", texto: "Qual banco vocês prefeririam pra um projeto novo hoje?", poll: ["PostgreSQL", "MySQL", "MongoDB", "SQLite"] },
  { user: "kira.ts", tag: "TypeScript", texto: "Enquete séria: vocês preferem `interface` ou `type` no dia a dia?", poll: ["interface", "type", "os dois, sem dó"] },
  { user: "elena.ops", tag: "DevOps", texto: "Pra deploy de um projeto pessoal, o que vocês escolheriam?", poll: ["VPS + Docker", "Serverless", "PaaS (Render/Railway)", "Kubernetes mesmo"] },
  { user: "paula.design", tag: "UI", texto: "Dark mode devia ser o padrão ou opcional?", poll: ["Padrão", "Opcional, mas com dark", "Não ligo"] },
  { user: "felipe.data", tag: "SQL", texto: "Time pequeno, qual orquestrador vocês usam pra pipelines?", poll: ["Airflow", "Dagster", "Cron mesmo", "dbt Cloud"] },
  { user: "hugo.java", tag: "Java", texto: "Semana que vem vou postar a comparação completa de Spring Boot vs Quarkus com benchmarks. Aguardem 👀", agendadoPara: 3 },
  { user: "leo.security", tag: "Segurança", texto: "Preparando um checklist de OWASP Top 10 aplicado a APIs REST. Sai em breve.", agendadoPara: 5 },
  { user: "gabi.ia", tag: "IA", texto: "@otavio.ml vi seu post sobre feature store, bate demais com o que eu tô fazendo com embeddings. Bora trocar ideia?" },
  { user: "iris.sql", tag: "Carreira", texto: "@felipe.data seu post sobre incremental no dbt me salvou hoje, valeu!" },
  { user: "joao.rn", tag: "React Native", texto: "@carla.mobile como você resolveu o crop de imagem no Android? Aqui ainda corta errado." },
  { user: "ana.codes", tag: "React", texto: "Refatorei o hook de paginação infinita pra usar IntersectionObserver em vez de scroll listener.\n\n```javascript\nconst observer = new IntersectionObserver((entries) => {\n  if (entries[0].isIntersecting) carregarMais();\n});\n```" },
  { user: "diego.ux", tag: "Acessibilidade", texto: "Testei o app inteiro só de teclado hoje. Achei 4 armadilhas de foco que ninguém tinha notado." },
  { user: "nico.cloud", tag: "Terraform", texto: "Módulo reutilizável de VPC finalmente ficou genérico o bastante pra outros times usarem sem copiar/colar." },
  { user: "marina.game", tag: "Unity", texto: "Object pooling pra inimigos: de 40fps pra 60fps estável em cena cheia.\n\n```csharp\npublic class Pool<T> where T : Component {\n    private readonly Queue<T> _itens = new();\n}\n```" },
  { user: "paula.design", tag: "Design Systems", texto: "Tokens de espaçamento em vez de valores soltos mudou completamente a consistência do nosso design system." },
];

const COMMENTS = [
  { postUser: "ana.codes", postTag: "React", by: "kira.ts", texto: "AbortController + ignore no unmount. Strict Mode é feature, não bug." },
  { postUser: "ana.codes", postTag: "React", by: "bruno.api", texto: "No server eu deduplico pelo request id. No client o abort já resolve 90%." },
  { postUser: "bruno.api", postTag: "PostgreSQL", by: "iris.sql", texto: "Se relacional manda no domínio, fica no Postgres. JSONB cobre o flexível sem migrar tudo." },
  { postUser: "bruno.api", postTag: "PostgreSQL", by: "gabi.ia", texto: "pgvector no mesmo banco é o argumento que me fez ficar no Postgres." },
  { postUser: "carla.mobile", postTag: "React Native", by: "joao.rn", texto: "EstimatedItemSize errado destrói o recycler. Meça o item real no device." },
  { postUser: "diego.ux", postTag: "CSS", by: "ana.codes", texto: "Eu começaria pelo foco visível e pelo label associado. Contraste depois." },
  { postUser: "diego.ux", postTag: "CSS", by: "paula.design", texto: "Manda o Figma que eu reviso a ordem de tab com vocês." },
  { postUser: "elena.ops", postTag: "DevOps", by: "nico.cloud", texto: "Railway funciona bem até o I/O do banco crescer. Aí RDS sai mais previsível." },
  { postUser: "felipe.data", postTag: "SQL", by: "iris.sql", texto: "Esse JOIN com comentarios explode o resultado. Agregue ou use EXISTS." },
  { postUser: "gabi.ia", postTag: "IA", by: "otavio.ml", texto: "HNSW no 0.7 está ok até uns milhões se você tiver RAM. IVFFlat se quiser economizar." },
  { postUser: "hugo.java", postTag: "Java", by: "leo.security", texto: "Rotation + família de refresh. Se roubarem um token, o resto cai junto." },
  { postUser: "iris.sql", postTag: "SQL", by: "felipe.data", texto: "EXPLAIN ANALYZE > feeling. Índice inverso salva o perfil do alvo." },
  { postUser: "joao.rn", postTag: "React Native", by: "carla.mobile", texto: "Scheme por flavor no app.json. Dev e prod não podem colidir." },
  { postUser: "kira.ts", postTag: "TypeScript", by: "ana.codes", texto: "Se o array é pequeno, useMemo quase nunca paga o ruído." },
  { postUser: "leo.security", postTag: "Segurança", by: "kira.ts", texto: "Se o HTML aparecer escapado, estamos bem. Se executar, hotfix hoje." },
  { postUser: "marina.game", postTag: "Game Dev", by: "joao.rn", texto: "Coyote + buffer juntos: uma flag `wasGrounded` com timer, outra `queuedJump`." },
  { postUser: "nico.cloud", postTag: "AWS", by: "elena.ops", texto: "Aurora Serverless v2 ainda tem piso. Pra hobby, RDS pequeno + backup ganha." },
  { postUser: "otavio.ml", postTag: "Python", by: "felipe.data", texto: "Feast quando tiver mais de um time consumindo a mesma feature. Antes, Parquet basta." },
  { postUser: "paula.design", postTag: "UI", by: "diego.ux", texto: "Amei a hierarquia. Número grande, tendência pequena, sem sparkline competindo." },
  { postUser: "ana.codes", postTag: "CSS", by: "paula.design", texto: "Tailwind no começo irrita. Depois você para de inventar nome de classe." },
  { postUser: "bruno.api", postTag: "Node", by: "leo.security", texto: "Redis se tiver mais de uma instância. Memória só em single box." },
  { postUser: "carla.mobile", postTag: "React Native", by: "kira.ts", texto: "Conflito de timestamp: relógio do device mente. Relógio do server + id monotônico." },
  { postUser: "gabi.ia", postTag: "Python", by: "hugo.java", texto: "Normaliza antes de salvar. Senão a distância fica inconsistente entre treino e inferência." },
  { postUser: "hugo.java", postTag: "Java", by: "bruno.api", texto: "Record + MapStruct vale quando o DTO diverge da tabela. Senão, overkill." },
  { postUser: "kira.ts", postTag: "React", by: "diego.ux", texto: "Form único também ajuda o upload de foto/capa a não divergir." },
  { postUser: "leo.security", postTag: "Auth", by: "ana.codes", texto: "Isso. Pedir senha de novo depois do Google é atrito inútil." },
  { postUser: "marina.game", postTag: "C#", by: "otavio.ml", texto: "ScriptableObject é o data class que o designer consegue editar. Curti." },
  { postUser: "nico.cloud", postTag: "Terraform", by: "elena.ops", texto: "State lock salvou a gente duas vezes esse mês. Não é opcional." },
  { postUser: "otavio.ml", postTag: "Python", by: "gabi.ia", texto: "Pipeline serializado no joblib. O notebook e a API usam o mesmo artefato." },
  { postUser: "paula.design", postTag: "CSS", by: "ana.codes", texto: "14\" com 32GB. Tela boa ajuda mais que CPU extra no dia a dia." },
  { postUser: "felipe.data", postTag: "SQL", by: "bruno.api", texto: "Contador no banco. O front só renderiza." },
  { postUser: "gabi.ia", postTag: "IA", by: "felipe.data", texto: "Recall@k + faithfulness. Sem métrica, o stakeholder escolhe o demo mais bonito." },
  { postUser: "iris.sql", postTag: "MySQL", by: "hugo.java", texto: "UNIQUE(avaliador, avaliado) + CHECK 1–5. Pronto, produto." },
  { postUser: "joao.rn", postTag: "Performance", by: "carla.mobile", texto: "Não desmonte o ícone durante a animação. Opacity 0 > unmount." },
  { postUser: "elena.ops", postTag: "CI", by: "nico.cloud", texto: "Lint + build já pega 80% do que quebra o deploy. Teste vem depois, com calma." },
];

const FOLLOWS = [
  ["ana.codes", "bruno.api"],
  ["ana.codes", "diego.ux"],
  ["ana.codes", "kira.ts"],
  ["ana.codes", "paula.design"],
  ["bruno.api", "iris.sql"],
  ["bruno.api", "leo.security"],
  ["bruno.api", "elena.ops"],
  ["carla.mobile", "joao.rn"],
  ["carla.mobile", "ana.codes"],
  ["diego.ux", "ana.codes"],
  ["diego.ux", "paula.design"],
  ["elena.ops", "bruno.api"],
  ["elena.ops", "nico.cloud"],
  ["felipe.data", "iris.sql"],
  ["felipe.data", "otavio.ml"],
  ["gabi.ia", "felipe.data"],
  ["gabi.ia", "otavio.ml"],
  ["hugo.java", "bruno.api"],
  ["iris.sql", "felipe.data"],
  ["joao.rn", "carla.mobile"],
  ["joao.rn", "marina.game"],
  ["kira.ts", "ana.codes"],
  ["leo.security", "bruno.api"],
  ["leo.security", "kira.ts"],
  ["marina.game", "joao.rn"],
  ["nico.cloud", "elena.ops"],
  ["otavio.ml", "gabi.ia"],
  ["paula.design", "diego.ux"],
  ["paula.design", "ana.codes"],
];

const RATINGS = [
  ["ana.codes", "bruno.api", 5],
  ["kira.ts", "ana.codes", 4],
  ["diego.ux", "ana.codes", 5],
  ["bruno.api", "iris.sql", 4],
  ["gabi.ia", "felipe.data", 5],
  ["joao.rn", "carla.mobile", 4],
  ["leo.security", "bruno.api", 3],
  ["elena.ops", "hugo.java", 4],
  ["paula.design", "diego.ux", 5],
  ["nico.cloud", "elena.ops", 4],
  ["otavio.ml", "gabi.ia", 5],
  ["marina.game", "joao.rn", 4],
];

const CHATS = [
  {
    a: "ana.codes",
    b: "bruno.api",
    messages: [
      ["ana.codes", "Olá! Vi seu projeto no DevSpace."],
      ["bruno.api", "Obrigado! Quer conversar sobre ele?"],
      ["ana.codes", "Quero sim. Principalmente a parte do Postgres."],
    ],
  },
  {
    a: "kira.ts",
    b: "diego.ux",
    messages: [
      ["kira.ts", "O design system novo ficou limpo."],
      ["diego.ux", "Obrigado! Ainda vou reduzir o backdrop do modal."],
    ],
  },
  {
    a: "carla.mobile",
    b: "joao.rn",
    messages: [
      ["carla.mobile", "FlashList no Android melhorou bastante aqui."],
      ["joao.rn", "Bora comparar estimatedItemSize depois?"],
    ],
  },
];

async function upsertUser(conn, hash, spec) {
  const email = `${spec.username}${SEED_DOMAIN}`;
  const [rows] = await conn.query("SELECT id FROM usuarios WHERE email = ? OR username = ? LIMIT 1", [email, spec.username]);
  if (rows[0]) {
    await conn.query(
      `UPDATE usuarios
       SET nome_exibicao = ?, bio = ?, stack = ?, linguagem_principal = ?, disponivel_contratacao = ?
       WHERE id = ?`,
      [spec.nome, spec.bio, spec.stack, spec.linguagem, spec.hire, rows[0].id]
    );
    return rows[0].id;
  }
  const [result] = await conn.query(
    `INSERT INTO usuarios (username, email, senha_hash, nome_exibicao, bio, stack, linguagem_principal, disponivel_contratacao, auth_provider)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'local')`,
    [spec.username, email, hash, spec.nome, spec.bio, spec.stack, spec.linguagem, spec.hire]
  );
  return result.insertId;
}

async function main() {
  if (String(process.env.NODE_ENV || "").toLowerCase() === "production") {
    console.error("Seed DEV recusado: NODE_ENV=production.");
    process.exit(1);
  }

  const conn = await mysql.createConnection(dbConfig());
  const hash = await bcrypt.hash(SEED_PASSWORD, 10);
  const ids = {};

  for (const spec of USERS) {
    ids[spec.username] = await upsertUser(conn, hash, spec);
  }

  const seedIds = Object.values(ids);
  if (seedIds.length) {
    await conn.query(
      `DELETE FROM posts WHERE usuario_id IN (${seedIds.map(() => "?").join(",")})`,
      seedIds
    );
  }

  for (const post of POSTS) {
    const [result] = await conn.query(
      "INSERT INTO posts (usuario_id, conteudo, linguagem_tag) VALUES (?, ?, ?)",
      [ids[post.user], post.texto, post.tag]
    );
    post._id = result.insertId;
  }

  for (const post of POSTS_FEATURES) {
    const publicarEm = post.agendadoPara
      ? new Date(Date.now() + post.agendadoPara * 86400000)
      : null;
    const [result] = await conn.query(
      "INSERT INTO posts (usuario_id, conteudo, linguagem_tag, publicar_em) VALUES (?, ?, ?, ?)",
      [ids[post.user], post.texto, post.tag, publicarEm]
    );
    post._id = result.insertId;

    if (post.imagem) {
      await conn.query("INSERT INTO midias (usuario_id, post_id, url, tipo) VALUES (?, ?, ?, 'imagem')", [
        ids[post.user],
        post._id,
        mockImage(post.user, post.imagem),
      ]);
    }

    if (post.poll) {
      const [pollResult] = await conn.query("INSERT INTO post_polls (post_id) VALUES (?)", [post._id]);
      for (let i = 0; i < post.poll.length; i += 1) {
        await conn.query("INSERT INTO post_poll_opcoes (poll_id, texto, ordem) VALUES (?, ?, ?)", [
          pollResult.insertId,
          post.poll[i],
          i,
        ]);
      }
    }
  }

  for (const comment of COMMENTS) {
    const post = POSTS.find((p) => p.user === comment.postUser && p.tag === comment.postTag);
    if (!post?._id || !ids[comment.by]) continue;
    await conn.query(
      "INSERT INTO comentarios (post_id, usuario_id, conteudo) VALUES (?, ?, ?)",
      [post._id, ids[comment.by], comment.texto]
    );
  }

  for (let i = 0; i < POSTS.length; i += 1) {
    const liker = USERS[(i + 3) % USERS.length].username;
    const saver = USERS[(i + 5) % USERS.length].username;
    const sharer = USERS[(i + 7) % USERS.length].username;
    await conn.query("INSERT IGNORE INTO post_interacoes (post_id, usuario_id, tipo) VALUES (?, ?, 'like')", [POSTS[i]._id, ids[liker]]);
    await conn.query("INSERT IGNORE INTO post_bookmarks (post_id, usuario_id) VALUES (?, ?)", [POSTS[i]._id, ids[saver]]);
    await conn.query("INSERT IGNORE INTO post_shares (post_id, usuario_id) VALUES (?, ?)", [POSTS[i]._id, ids[sharer]]);
  }

  // Posts agendados pro futuro ficam de fora das interacoes fake -- ainda
  // nao estao "publicados", entao ninguem deveria ter curtido/votado neles.
  const postsPublicados = POSTS_FEATURES.filter((p) => !p.agendadoPara);
  for (let i = 0; i < postsPublicados.length; i += 1) {
    const post = postsPublicados[i];
    const liker = USERS[(i + 2) % USERS.length].username;
    const saver = USERS[(i + 4) % USERS.length].username;
    const sharer = USERS[(i + 6) % USERS.length].username;
    await conn.query("INSERT IGNORE INTO post_interacoes (post_id, usuario_id, tipo) VALUES (?, ?, 'like')", [post._id, ids[liker]]);
    await conn.query("INSERT IGNORE INTO post_bookmarks (post_id, usuario_id) VALUES (?, ?)", [post._id, ids[saver]]);
    await conn.query("INSERT IGNORE INTO post_shares (post_id, usuario_id) VALUES (?, ?)", [post._id, ids[sharer]]);

    if (post.poll) {
      const opcoes = await conn.query(
        "SELECT po.id, po.poll_id FROM post_poll_opcoes po JOIN post_polls pp ON pp.id = po.poll_id WHERE pp.post_id = ? ORDER BY po.ordem ASC",
        [post._id]
      );
      const rows = opcoes[0];
      // Distribui alguns votos de usuarios diferentes entre as opcoes, pra
      // enquete nao aparecer vazia/zerada ao testar.
      for (let v = 0; v < Math.min(6, USERS.length); v += 1) {
        const votante = USERS[(i + v) % USERS.length].username;
        const opcao = rows[v % rows.length];
        if (!ids[votante] || !opcao) continue;
        await conn.query("INSERT IGNORE INTO post_poll_votos (poll_id, opcao_id, usuario_id) VALUES (?, ?, ?)", [opcao.poll_id, opcao.id, ids[votante]]);
      }
    }

    const mencoes = [...new Set((post.texto.match(/@([a-zA-Z0-9._-]{3,30})/g) || []).map((m) => m.slice(1)))];
    for (const handle of mencoes) {
      if (!ids[handle]) continue;
      await conn.query(
        `INSERT INTO notificacoes (destinatario_id, ator_id, tipo, post_id) VALUES (?, ?, 'mencao', ?)`,
        [ids[handle], ids[post.user], post._id]
      );
    }
  }

  for (const [a, b] of FOLLOWS) {
    if (!ids[a] || !ids[b] || ids[a] === ids[b]) continue;
    await conn.query("INSERT IGNORE INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?)", [ids[a], ids[b]]);
  }

  for (const [a, b, nota] of RATINGS) {
    if (!ids[a] || !ids[b]) continue;
    await conn.query(
      `INSERT INTO avaliacoes_perfil (avaliador_id, avaliado_id, nota)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE nota = VALUES(nota)`,
      [ids[a], ids[b], nota]
    );
  }

  for (const chat of CHATS) {
    const a = ids[chat.a];
    const b = ids[chat.b];
    if (!a || !b) continue;
    const [existing] = await conn.query(
      `SELECT c.id FROM conversas c
       JOIN conversa_participantes p1 ON p1.conversa_id = c.id AND p1.usuario_id = ?
       JOIN conversa_participantes p2 ON p2.conversa_id = c.id AND p2.usuario_id = ?
       LIMIT 1`,
      [a, b]
    );
    let conversaId = existing[0]?.id;
    if (!conversaId) {
      const [created] = await conn.query("INSERT INTO conversas (titulo) VALUES (?)", [`${chat.a} + ${chat.b}`]);
      conversaId = created.insertId;
      await conn.query("INSERT INTO conversa_participantes (conversa_id, usuario_id) VALUES (?, ?), (?, ?)", [conversaId, a, conversaId, b]);
    }
    const [msgCount] = await conn.query("SELECT COUNT(*) AS c FROM mensagens WHERE conversa_id = ?", [conversaId]);
    if (Number(msgCount[0]?.c || 0) === 0) {
      for (const [from, texto] of chat.messages) {
        await conn.query("INSERT INTO mensagens (conversa_id, remetente_id, conteudo) VALUES (?, ?, ?)", [conversaId, ids[from], texto]);
      }
    }
  }

  await conn.end();
  console.log("Seed DEV ok.");
  console.log(`Usuários: ${USERS.length} (${SEED_DOMAIN})`);
  console.log(`Posts: ${POSTS.length} · Comentários: ${COMMENTS.length}`);
  console.log(`Senha padrão: ${SEED_PASSWORD}`);
  console.log("Exemplos: ana.codes / bruno.api / kira.ts");
}

main().catch((error) => {
  console.error("Seed DEV falhou:", error.message);
  process.exit(1);
});
