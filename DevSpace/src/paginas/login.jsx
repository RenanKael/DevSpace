import "../style/login.css";
import logo from "../assets/IMGS/Black-DevSpace-removebg-preview.png";

export default function Login({ onLogin }) {
  return (
    <div className="container">
      <div className="left">
        <img src={logo} width="300" />
        <h2>Faça login e entre para o nosso time!</h2>
      </div>

      <div className="right">
        <div className="card">
          <h3>Entrar no DevSpace</h3>

          <input
            type="text"
            placeholder="Nome de usuário ou email"
          />

          <input
            type="password"
            placeholder="Senha"
          />

          <button onClick={onLogin}>Entrar</button>
        </div>
      </div>
    </div>
  );
}