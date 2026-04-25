import "../style/home.css";

export default function Topbar({ visible, usuario }) {
  return (
    <div className={`topbar ${visible ? "show" : "hide"}`}>
      <input type="text" placeholder="Buscar" />

      <div className="profile">
        {/* 👇 mostra nome real */}
        <span>{usuario ? usuario.username : "..."}</span>
        <div className="avatar"></div>
      </div>
    </div>
  );
}