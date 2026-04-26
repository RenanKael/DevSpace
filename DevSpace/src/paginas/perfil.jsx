<div className="profile-page">

  {/* CAPA */}
  <div
    className="capa"
    style={{
      backgroundImage: usuario.fotoCapa
        ? `url(${usuario.fotoCapa})`
        : "none",
    }}
  ></div>

  {/* HEADER (foto + botão) */}
  <div className="perfil-header">
    <div
      className="foto"
      style={{
        backgroundImage: usuario.fotoPerfil
          ? `url(${usuario.fotoPerfil})`
          : "none",
      }}
    ></div>

    <button className="btn-editar">
      Editar Perfil
    </button>
  </div>

  {/* INFO PRINCIPAL */}
  <div className="info">
    <h2>{usuario.username}</h2>
    <span>@{usuario.username}</span>

    <p className="data">
      Entrou em{" "}
      {usuario.criadoEm
        ? new Date(usuario.criadoEm).toLocaleDateString()
        : "..."}
    </p>

    <p className="bio">
      {usuario.bio || "Sem bio..."}
    </p>

    {/* STATS */}
    <div className="stats">
      <span>Seguindo 0</span>
      <span>Seguidores 0</span>
      <span>Projetos 0</span>
    </div>
  </div>

  {/* CARD BIO */}
  <div className="bio-card">
    <p>Dev Back End.</p>
    <p>WhatsApp: ...</p>
    <p>Instagram: ...</p>
  </div>

</div>