import "../style/login.css";
import logo from "../assets/IMGS/Black-DevSpace-removebg-preview.png";
import { useState } from "react";

export default function Login({ onLogin }) {
  const [modoCadastro, setModoCadastro] = useState(false);

  return (
    <div className="container">
      
      <div className="left">
        <img src={logo} />
        <h2>Faça login e entre para o nosso time!</h2>
      </div>

      <div className="right">
        <div className="card">

          <h3>
            {modoCadastro ? "Criar conta" : "Entrar no DevSpace"}
          </h3>

          {modoCadastro && (
            <input
              type="text"
              placeholder="Nome de usuário"
            />
          )}

          <input
            type="text"
            placeholder="Email"
          />

          <input
            type="password"
            placeholder="Senha"
          />

          {/* BOTÕES */}
          {!modoCadastro ? (
            <>
              <button onClick={onLogin}>Entrar</button>
              <button 
                className="btn-secundario"
                onClick={() => setModoCadastro(true)}
              >
                Cadastrar
              </button>
            </>
          ) : (
            <>
              <button>Criar conta</button>
              <button 
                className="btn-secundario"
                onClick={() => setModoCadastro(false)}
              >
                Voltar ao login
              </button>
            </>
          )}

          <span></span>

        </div>
      </div>

    </div>
  );
}