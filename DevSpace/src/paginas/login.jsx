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

  function criarConta() {
    if (!username || !email || !senha) {
      setErro("Preencha todos os campos!");
      return;
    }

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    const jaExiste = usuarios.find((u) => u.email === email);
    if (jaExiste) {
      setErro("Este email já está cadastrado.");
      return;
    }

    const novoUsuario = {
      username,
      email,
      senha,
      criadoEm: new Date().toISOString(),
      bio: "",
      fotoPerfil: "",
      fotoCapa: "",
      estrelas: 1,
      projetos: []
    };

    usuarios.push(novoUsuario);
    localStorage.setItem("usuarios", JSON.stringify(usuarios));

    setSucesso("Conta criada com sucesso! Faça login agora.");
    setErro("");

    setUsername("");
    setEmail("");
    setSenha("");

    setTimeout(() => {
      setModoCadastro(false);
      setSucesso("");
    }, 2500);
  }

  function entrar() {
    if (!email || !senha) {
      setErro("Digite email ou nome de usuário e senha.");
      return;
    }

    const usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    // 🔥 ADMIN (continua funcionando)
    const loginsAdmin = [
      { login: "renan.kael@gmail.com", senha: "rklv2007" },
      { login: "AllzynADM", senha: "rklv2007" }
    ];

    const isAdminLogin = loginsAdmin.find(
      (l) => l.login === email && l.senha === senha
    );

    if (isAdminLogin) {
      let admin = usuarios.find(
        (u) => u.email === "renan.kael@gmail.com"
      );

      if (!admin) {
        admin = {
          username: "RenanADM",
          email: "renan.kael@gmail.com",
          senha: "rklv2007",
          criadoEm: new Date().toISOString(),
          bio: "Conta administrativa",
          fotoPerfil: "",
          fotoCapa: "",
          estrelas: 5,
          projetos: [],
          avaliacao: 5
        };

        usuarios.push(admin);
        localStorage.setItem("usuarios", JSON.stringify(usuarios));
      }

      localStorage.setItem("usuarioLogado", JSON.stringify(admin));
      onLogin();
      return;
    }

    // 🔥 LOGIN NORMAL CORRIGIDO
    const usuarioEncontrado = usuarios.find(
      (u) =>
        (u.email === email || u.username === email)
    );

    if (!usuarioEncontrado) {
      setErro("Usuário não encontrado!");
      return;
    }

    // 🔥 COMPARAÇÃO REAL DA SENHA ATUAL
    if (usuarioEncontrado.senha !== senha) {
      setErro("Senha incorreta!");
      return;
    }

    // 🔥 SEMPRE USA DADO ATUAL DO LOCALSTORAGE
    localStorage.setItem("usuarioLogado", JSON.stringify(usuarioEncontrado));
    onLogin();
  }

  return (
    <div className="container">
      <div className="left">
        <img src={logo} />
        <h2>Faça login e entre para o nosso time!</h2>
      </div>

      <div className="right">
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            if (modoCadastro) {
              criarConta();
            } else {
              entrar();
            }
          }}
        >
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
              <button type="submit">Entrar</button>

              <button
                type="button"
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
              <button type="submit">Criar conta</button>

              <button
                type="button"
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
        </form>
      </div>
    </div>
  );
}