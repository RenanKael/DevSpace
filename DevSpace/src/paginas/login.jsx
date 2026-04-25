import "../style/login.css";
import logo from "../assets/IMGS/Black-DevSpace-removebg-preview.png";
import { useState } from "react";

export default function Login({ onLogin }) {
  const [modoCadastro, setModoCadastro] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // =========================
  // CRIAR CONTA
  // =========================
  function criarConta() {
    if (!username || !email || !senha) {
      setErro("Preencha todos os campos!");
      return;
    }

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    // impedir email repetido
    const jaExiste = usuarios.find((u) => u.email === email);
    if (jaExiste) {
      setErro("Este email já está cadastrado.");
      return;
    }

    usuarios.push({ username, email, senha });
    localStorage.setItem("usuarios", JSON.stringify(usuarios));

    // notificação no site
    setSucesso("Conta criada com sucesso! Faça login 😊");
    setErro("");

    // limpar campos
    setUsername("");
    setEmail("");
    setSenha("");

    // voltar pro login após 1.5s
    setTimeout(() => {
      setModoCadastro(false);
      setSucesso("");
    }, 1500);
  }

  // =========================
  // LOGIN
  // =========================
  function entrar() {
    if (!email || !senha) {
      setErro("Digite email ou nome de usuário e senha.");
      return;
    }

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const usuarioEncontrado = usuarios.find(
      (u) =>
        (u.email === email || u.username === email) &&
        u.senha === senha
    );

    if (!usuarioEncontrado) {
      setErro("Usuário ou senha inválidos!");
      return;
    }

    localStorage.setItem("usuarioLogado", JSON.stringify(usuarioEncontrado));
    onLogin(); // ir para Home
  }

  // =========================
  // JSX
  // =========================
  return (
    <div className="container">
      <div className="left">
        <img src={logo} />
        <h2>Faça login e entre para o nosso time!</h2>
      </div>

      <div className="right">
        <div className="card">
          <h3>{modoCadastro ? "Criar conta" : "Entrar no DevSpace"}</h3>

          {modoCadastro && (
            <input
              type="text"
              placeholder="Nome de usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          )}

          <input
            type="text"
            placeholder={modoCadastro ? "Email" : "Email ou usuário"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />

          {erro && <p className="erro">{erro}</p>}
          {sucesso && <p className="sucesso">{sucesso}</p>}

          {!modoCadastro ? (
            <>
              <button onClick={entrar}>Entrar</button>

              <button
                className="btn-secundario"
                onClick={() => {
                  setErro("");
                  setSucesso("");
                  setModoCadastro(true);
                }}
              >
                Cadastrar
              </button>
            </>
          ) : (
            <>
              <button onClick={criarConta}>Criar conta</button>

              <button
                className="btn-secundario"
                onClick={() => {
                  setErro("");
                  setSucesso("");
                  setModoCadastro(false);
                }}
              >
                Voltar ao login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}