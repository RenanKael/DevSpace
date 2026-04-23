import "../style/login.css";

export default function Login() {
  return (
    <div className="container">
      <div className="left">
        <div><img src="" alt="" /></div>
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

          <button>Entrar</button>
        </div>
      </div>
    </div>
  );
}