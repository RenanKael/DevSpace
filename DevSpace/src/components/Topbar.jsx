import "../style/home.css";

export default function Topbar({ visible, usuario }) {
  return (
    <div className={`topbar ${visible ? "show" : "hide"}`}>
      <input type="text" placeholder="Buscar" />

      <div className="profile">
        <div className="user-info">
          <span className="nome">
            {usuario ? usuario.username : "..."}
          </span>

          <span className="arroba">
            @{usuario ? usuario.username : "..."}
          </span>
        </div>

        <div className="avatar" style={{
          backgroundImage: usuario?.fotoPerfil ? `url(${usuario.fotoPerfil})` : 'none',
          backgroundPosition: usuario?.posPerfil ? `${usuario.posPerfil.x}% ${usuario.posPerfil.y}%` : 'center',
          backgroundSize: 'cover'
        }}></div>
      </div>
    </div>
  );
}