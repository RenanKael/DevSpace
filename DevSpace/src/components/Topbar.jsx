import "../style/home.css";

export default function Topbar({ visible }) {
  return (
    <div className={`topbar ${visible ? "show" : "hide"}`}>
      <input type="text" placeholder="Buscar" />

      <div className="profile">
        <span>SeuUser</span>
        <div className="avatar"></div>
      </div>
    </div>
  );
}