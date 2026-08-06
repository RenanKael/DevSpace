// Cria (de forma idempotente) todo o schema MySQL do projeto: as tabelas
// originais do grupo (usuarios, posts, comentarios, seguidores, chat...)
// mais as tabelas adicionadas para as features do DevSpace que ainda nao
// tinham suporte no banco (enquete, repost, salvos, agendamento de post).
// Seguro rodar mais de uma vez: so cria o que ainda nao existe.
import "dotenv/config";
import mysql from "mysql2/promise";

const CREATE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS usuarios (
    id BIGINT NOT NULL AUTO_INCREMENT,
    username VARCHAR(30) NOT NULL,
    email VARCHAR(255) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) DEFAULT NULL,
    nome_exibicao VARCHAR(100) DEFAULT NULL,
    bio VARCHAR(280) DEFAULT NULL,
    avatar_url LONGTEXT,
    foto_capa_url LONGTEXT,
    linguagem_principal VARCHAR(50) DEFAULT NULL,
    stack VARCHAR(255) DEFAULT NULL,
    github_url TEXT,
    linkedin_url TEXT,
    site_url TEXT,
    disponivel_contratacao TINYINT(1) NOT NULL DEFAULT 0,
    is_admin TINYINT(1) NOT NULL DEFAULT 0,
    pos_perfil_x SMALLINT NOT NULL DEFAULT 50,
    pos_perfil_y SMALLINT NOT NULL DEFAULT 50,
    pos_capa_x SMALLINT NOT NULL DEFAULT 50,
    pos_capa_y SMALLINT NOT NULL DEFAULT 50,
    zoom_perfil SMALLINT NOT NULL DEFAULT 100,
    zoom_capa SMALLINT NOT NULL DEFAULT 100,
    ativo TINYINT(1) NOT NULL DEFAULT 1,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY username (username),
    UNIQUE KEY email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  `CREATE TABLE IF NOT EXISTS star_levels (
    id BIGINT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(50) NOT NULL,
    ordem SMALLINT NOT NULL,
    xp_necessario INT NOT NULL,
    icone_url TEXT,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY nome (nome),
    UNIQUE KEY ordem (ordem),
    CONSTRAINT chk_xp_necessario_positivo CHECK (xp_necessario >= 0)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  `CREATE TABLE IF NOT EXISTS posts (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT NOT NULL,
    conteudo TEXT NOT NULL,
    linguagem_tag VARCHAR(50) DEFAULT NULL,
    publicar_em TIMESTAMP NULL DEFAULT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_posts_usuario (usuario_id),
    KEY idx_posts_criado_em (criado_em DESC),
    CONSTRAINT fk_posts_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  `CREATE TABLE IF NOT EXISTS comentarios (
    id BIGINT NOT NULL AUTO_INCREMENT,
    post_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    comentario_pai_id BIGINT DEFAULT NULL,
    conteudo TEXT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_comentarios_post (post_id),
    KEY idx_comentarios_usuario (usuario_id),
    KEY idx_comentarios_pai (comentario_pai_id),
    CONSTRAINT fk_comentarios_pai FOREIGN KEY (comentario_pai_id) REFERENCES comentarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_comentarios_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_comentarios_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  `CREATE TABLE IF NOT EXISTS comentario_curtidas (
    id BIGINT NOT NULL AUTO_INCREMENT,
    comentario_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_comentario_curtida (comentario_id, usuario_id),
    KEY idx_comentario_curtidas_comentario (comentario_id),
    KEY idx_comentario_curtidas_usuario (usuario_id),
    CONSTRAINT fk_comentario_curtidas_comentario FOREIGN KEY (comentario_id) REFERENCES comentarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_comentario_curtidas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  `CREATE TABLE IF NOT EXISTS seguidores (
    id BIGINT NOT NULL AUTO_INCREMENT,
    seguidor_id BIGINT NOT NULL,
    seguido_id BIGINT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_seguidor_seguido (seguidor_id, seguido_id),
    KEY idx_seguidores_seguidor (seguidor_id),
    KEY idx_seguidores_seguido (seguido_id),
    CONSTRAINT fk_seguidores_seguido FOREIGN KEY (seguido_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_seguidores_seguidor FOREIGN KEY (seguidor_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT chk_nao_seguir_a_si_mesmo CHECK (seguidor_id <> seguido_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  `CREATE TABLE IF NOT EXISTS conversas (
    id BIGINT NOT NULL AUTO_INCREMENT,
    titulo VARCHAR(150) DEFAULT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  `CREATE TABLE IF NOT EXISTS conversa_participantes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    conversa_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    entrou_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_conversa_usuario (conversa_id, usuario_id),
    KEY idx_conversa_participantes_conversa (conversa_id),
    KEY idx_conversa_participantes_usuario (usuario_id),
    CONSTRAINT fk_conversa_participantes_conversa FOREIGN KEY (conversa_id) REFERENCES conversas (id) ON DELETE CASCADE,
    CONSTRAINT fk_conversa_participantes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  `CREATE TABLE IF NOT EXISTS mensagens (
    id BIGINT NOT NULL AUTO_INCREMENT,
    conversa_id BIGINT NOT NULL,
    remetente_id BIGINT NOT NULL,
    conteudo TEXT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lida TINYINT(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_mensagens_conversa (conversa_id, criado_em),
    KEY idx_mensagens_remetente (remetente_id),
    KEY idx_mensagens_nao_lidas (conversa_id, lida),
    CONSTRAINT fk_mensagens_conversa FOREIGN KEY (conversa_id) REFERENCES conversas (id) ON DELETE CASCADE,
    CONSTRAINT fk_mensagens_remetente FOREIGN KEY (remetente_id) REFERENCES usuarios (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  `CREATE TABLE IF NOT EXISTS midias (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT NOT NULL,
    post_id BIGINT DEFAULT NULL,
    comentario_id BIGINT DEFAULT NULL,
    mensagem_id BIGINT DEFAULT NULL,
    url LONGTEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    tamanho_bytes BIGINT DEFAULT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_midias_usuario (usuario_id),
    KEY idx_midias_post (post_id),
    KEY idx_midias_comentario (comentario_id),
    KEY idx_midias_mensagem (mensagem_id),
    CONSTRAINT fk_midias_comentario FOREIGN KEY (comentario_id) REFERENCES comentarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_midias_mensagem FOREIGN KEY (mensagem_id) REFERENCES mensagens (id) ON DELETE CASCADE,
    CONSTRAINT fk_midias_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_midias_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT chk_midia_um_dono CHECK (
      ((post_id IS NOT NULL) + (comentario_id IS NOT NULL) + (mensagem_id IS NOT NULL)) <= 1
    ),
    CONSTRAINT chk_tipo_midia CHECK (tipo IN ('imagem', 'video', 'gif', 'arquivo'))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  `CREATE TABLE IF NOT EXISTS post_interacoes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    post_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    tipo VARCHAR(20) NOT NULL DEFAULT 'like',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_post_interacao (post_id, usuario_id),
    KEY idx_post_interacoes_post (post_id),
    KEY idx_post_interacoes_usuario (usuario_id),
    CONSTRAINT fk_post_interacoes_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_post_interacoes_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT chk_tipo_interacao CHECK (tipo IN ('like', 'amei', 'haha', 'uau', 'triste', 'apoio'))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  `CREATE TABLE IF NOT EXISTS contratos (
    id BIGINT NOT NULL AUTO_INCREMENT,
    conversa_id BIGINT DEFAULT NULL,
    contratante_id BIGINT NOT NULL,
    freelancer_id BIGINT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    descricao TEXT,
    valor DECIMAL(12, 2) DEFAULT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'proposto',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_contratos_contratante (contratante_id),
    KEY idx_contratos_freelancer (freelancer_id),
    KEY idx_contratos_conversa (conversa_id),
    CONSTRAINT fk_contratos_contratante FOREIGN KEY (contratante_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
    CONSTRAINT fk_contratos_conversa FOREIGN KEY (conversa_id) REFERENCES conversas (id) ON DELETE SET NULL,
    CONSTRAINT fk_contratos_freelancer FOREIGN KEY (freelancer_id) REFERENCES usuarios (id) ON DELETE RESTRICT,
    CONSTRAINT chk_contrato_partes_diferentes CHECK (contratante_id <> freelancer_id),
    CONSTRAINT chk_status_contrato CHECK (status IN ('proposto', 'aceito', 'em_andamento', 'concluido', 'cancelado'))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  `CREATE TABLE IF NOT EXISTS user_star_stats (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT NOT NULL,
    star_level_id BIGINT NOT NULL,
    xp_atual INT NOT NULL DEFAULT 0,
    atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY usuario_id (usuario_id),
    KEY idx_user_star_stats_star_level (star_level_id),
    CONSTRAINT fk_user_star_stats_star_level FOREIGN KEY (star_level_id) REFERENCES star_levels (id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_star_stats_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT chk_xp_atual_positivo CHECK (xp_atual >= 0)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  `CREATE TABLE IF NOT EXISTS post_shares (
    id BIGINT NOT NULL AUTO_INCREMENT,
    post_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_post_share (post_id, usuario_id),
    KEY idx_post_shares_post (post_id),
    KEY idx_post_shares_usuario (usuario_id),
    CONSTRAINT fk_post_shares_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_post_shares_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  `CREATE TABLE IF NOT EXISTS post_bookmarks (
    id BIGINT NOT NULL AUTO_INCREMENT,
    post_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_post_bookmark (post_id, usuario_id),
    KEY idx_post_bookmarks_post (post_id),
    KEY idx_post_bookmarks_usuario (usuario_id),
    CONSTRAINT fk_post_bookmarks_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_post_bookmarks_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  `CREATE TABLE IF NOT EXISTS post_polls (
    id BIGINT NOT NULL AUTO_INCREMENT,
    post_id BIGINT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_post_poll (post_id),
    CONSTRAINT fk_post_polls_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  `CREATE TABLE IF NOT EXISTS post_poll_opcoes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    poll_id BIGINT NOT NULL,
    texto VARCHAR(80) NOT NULL,
    ordem SMALLINT NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    KEY idx_poll_opcoes_poll (poll_id),
    CONSTRAINT fk_poll_opcoes_poll FOREIGN KEY (poll_id) REFERENCES post_polls (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  // Recurso independente do feed (usado na pagina Explorar), sem FK com o resto do schema.
  `CREATE TABLE IF NOT EXISTS tarefas (
    id BIGINT NOT NULL AUTO_INCREMENT,
    descricao TEXT NOT NULL,
    status TINYINT(1) NOT NULL DEFAULT 0,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  `CREATE TABLE IF NOT EXISTS post_poll_votos (
    id BIGINT NOT NULL AUTO_INCREMENT,
    poll_id BIGINT NOT NULL,
    opcao_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_poll_voto (poll_id, usuario_id),
    KEY idx_poll_votos_opcao (opcao_id),
    CONSTRAINT fk_poll_votos_poll FOREIGN KEY (poll_id) REFERENCES post_polls (id) ON DELETE CASCADE,
    CONSTRAINT fk_poll_votos_opcao FOREIGN KEY (opcao_id) REFERENCES post_poll_opcoes (id) ON DELETE CASCADE,
    CONSTRAINT fk_poll_votos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  // Pedido de contato pendente ("fulano quer te contatar"). A existencia da
  // linha JA significa "pendente" -- aceitar/recusar simplesmente apaga a
  // linha (aceitar tambem cria/reaproveita a conversa correspondente).
  `CREATE TABLE IF NOT EXISTS solicitacoes_contato (
    id BIGINT NOT NULL AUTO_INCREMENT,
    remetente_id BIGINT NOT NULL,
    destinatario_id BIGINT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_solicitacao_par (remetente_id, destinatario_id),
    KEY idx_solicitacoes_destinatario (destinatario_id),
    CONSTRAINT fk_solicitacoes_remetente FOREIGN KEY (remetente_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_solicitacoes_destinatario FOREIGN KEY (destinatario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT chk_solicitacao_partes_diferentes CHECK (remetente_id <> destinatario_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  // Notificacoes de atividade: curtida no post, comentario no post, curtida
  // no comentario, mencao (@handle) no texto de um post.
  `CREATE TABLE IF NOT EXISTS notificacoes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    destinatario_id BIGINT NOT NULL,
    ator_id BIGINT NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    post_id BIGINT DEFAULT NULL,
    comentario_id BIGINT DEFAULT NULL,
    lida TINYINT(1) NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_notificacoes_destinatario (destinatario_id, lida),
    KEY idx_notificacoes_post (post_id),
    KEY idx_notificacoes_comentario (comentario_id),
    CONSTRAINT fk_notificacoes_destinatario FOREIGN KEY (destinatario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_notificacoes_ator FOREIGN KEY (ator_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_notificacoes_post FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
    CONSTRAINT fk_notificacoes_comentario FOREIGN KEY (comentario_id) REFERENCES comentarios (id) ON DELETE CASCADE,
    CONSTRAINT chk_notificacao_tipo CHECK (tipo IN ('curtida_post', 'comentario_post', 'curtida_comentario', 'mencao'))
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,

  // Bloqueios entre usuarios: quem bloqueia deixa de ver posts/perfil de
  // quem bloqueou, e nenhum dos dois consegue mandar mensagem/solicitacao
  // de contato pro outro enquanto o bloqueio existir.
  `CREATE TABLE IF NOT EXISTS bloqueios (
    id BIGINT NOT NULL AUTO_INCREMENT,
    usuario_id BIGINT NOT NULL,
    bloqueado_id BIGINT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_bloqueio_par (usuario_id, bloqueado_id),
    KEY idx_bloqueios_bloqueado (bloqueado_id),
    CONSTRAINT fk_bloqueios_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT fk_bloqueios_bloqueado FOREIGN KEY (bloqueado_id) REFERENCES usuarios (id) ON DELETE CASCADE,
    CONSTRAINT chk_bloqueio_partes_diferentes CHECK (usuario_id <> bloqueado_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
];

async function addColumnIfMissing(conn, table, column, definition) {
  const [rows] = await conn.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, column]
  );
  if (rows.length > 0) return;
  await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  console.log(`OK: ${table}.${column} adicionada`);
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  for (const statement of CREATE_STATEMENTS) {
    const tableName = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
    try {
      await conn.query(statement);
      console.log(`OK: ${tableName}`);
    } catch (error) {
      console.error(`FALHOU: ${tableName} ->`, error.message);
    }
  }

  // Colunas que precisam existir/ter o tipo certo em bancos ja criados antes
  // desta migracao (idempotente: so altera se ainda nao estiver correto).
  const [avatarCol] = await conn.query(
    "SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'avatar_url'"
  );
  if (avatarCol[0] && avatarCol[0].DATA_TYPE !== "longtext") {
    await conn.query("ALTER TABLE usuarios MODIFY COLUMN avatar_url LONGTEXT");
    console.log("OK: usuarios.avatar_url -> LONGTEXT");
  }

  const [midiaCol] = await conn.query(
    "SELECT DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'midias' AND COLUMN_NAME = 'url'"
  );
  if (midiaCol[0] && midiaCol[0].DATA_TYPE !== "longtext") {
    await conn.query("ALTER TABLE midias MODIFY COLUMN url LONGTEXT NOT NULL");
    console.log("OK: midias.url -> LONGTEXT");
  }

  const [publicarCol] = await conn.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'publicar_em'"
  );
  if (publicarCol.length === 0) {
    await conn.query("ALTER TABLE posts ADD COLUMN publicar_em TIMESTAMP NULL DEFAULT NULL AFTER linguagem_tag");
    console.log("OK: posts.publicar_em adicionada");
  }

  await addColumnIfMissing(conn, "usuarios", "telefone", "telefone VARCHAR(20) DEFAULT NULL AFTER senha_hash");
  await addColumnIfMissing(conn, "usuarios", "foto_capa_url", "foto_capa_url LONGTEXT AFTER avatar_url");
  await addColumnIfMissing(conn, "usuarios", "disponivel_contratacao", "disponivel_contratacao TINYINT(1) NOT NULL DEFAULT 0 AFTER site_url");
  await addColumnIfMissing(conn, "usuarios", "is_admin", "is_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER disponivel_contratacao");
  await addColumnIfMissing(conn, "usuarios", "pos_perfil_x", "pos_perfil_x SMALLINT NOT NULL DEFAULT 50 AFTER is_admin");
  await addColumnIfMissing(conn, "usuarios", "pos_perfil_y", "pos_perfil_y SMALLINT NOT NULL DEFAULT 50 AFTER pos_perfil_x");
  await addColumnIfMissing(conn, "usuarios", "pos_capa_x", "pos_capa_x SMALLINT NOT NULL DEFAULT 50 AFTER pos_perfil_y");
  await addColumnIfMissing(conn, "usuarios", "pos_capa_y", "pos_capa_y SMALLINT NOT NULL DEFAULT 50 AFTER pos_capa_x");
  await addColumnIfMissing(conn, "usuarios", "zoom_perfil", "zoom_perfil SMALLINT NOT NULL DEFAULT 100 AFTER pos_capa_y");
  await addColumnIfMissing(conn, "usuarios", "zoom_capa", "zoom_capa SMALLINT NOT NULL DEFAULT 100 AFTER zoom_perfil");

  // Niveis de estrela padrao (usados por user_star_stats). So insere o que faltar.
  const niveis = [
    { nome: "Iniciante", ordem: 1, xp: 0 },
    { nome: "Colaborador", ordem: 2, xp: 50 },
    { nome: "Destaque", ordem: 3, xp: 150 },
    { nome: "Referencia", ordem: 4, xp: 400 },
    { nome: "Lenda", ordem: 5, xp: 1000 },
  ];
  for (const nivel of niveis) {
    await conn.query(
      "INSERT IGNORE INTO star_levels (nome, ordem, xp_necessario) VALUES (?, ?, ?)",
      [nivel.nome, nivel.ordem, nivel.xp]
    );
  }
  console.log("OK: star_levels padrao garantidos");

  await conn.end();
  console.log("\nSchema pronto.");
}

main().catch((error) => {
  console.error("Erro ao configurar o banco:", error.message);
  process.exit(1);
});
