import { useState } from "react";
import "../style/login.css";
import logo from "../assets/IMGS/Black-DevSpace-removebg-preview.png";

const ADMIN_EMAIL = "renan.kael@gmail.com";
const ADMIN_HANDLE = "renanadm";
const GOOGLE_EMAIL = "usuario.google@devspace.app";

function getUsuarios() {
  return JSON.parse(localStorage.getItem("usuarios")) || [];
}

function normalizeHandle(value) {
  return value.replace(/^@+/, "").replace(/\s+/g, "").toLowerCase();
}

function onlyDigits(value) {
  return value.replace(/\D/g, "");
}

function createBaseUser(extra) {
  return {
    username: "",
    handle: "",
    email: "",
    senha: "",
    telefone: "",
    criadoEm: new Date().toISOString(),
    bio: "",
    fotoPerfil: "",
    fotoCapa: "",
    estrelas: 1,
    projetos: [],
    seguidores: 0,
    seguindo: [],
    comments: 0,
    isAdmin: false,
    ...extra,
  };
}

function ensureAdminUser() {
  const usuarios = getUsuarios();
  const admin = usuarios.find((u) => (u.email || "").toLowerCase() === ADMIN_EMAIL);

  if (admin) return { usuarios, admin };

  const novoAdmin = createBaseUser({
    username: "RenanADM",
    handle: ADMIN_HANDLE,
    email: ADMIN_EMAIL,
    senha: "rklv2007",
    telefone: "",
    bio: "Conta administrativa",
    estrelas: 6,
    avaliacao: 6,
    isAdmin: true,
  });

  const atualizados = [...usuarios, novoAdmin];
  localStorage.setItem("usuarios", JSON.stringify(atualizados));
  return { usuarios: atualizados, admin: novoAdmin };
}

export default function Login({ onLogin }) {
  const [etapa, setEtapa] = useState("login");
  const [metodoCadastro, setMetodoCadastro] = useState("sms");
  const [identidadeVerificada, setIdentidadeVerificada] = useState(null);

  const [telefoneCadastro, setTelefoneCadastro] = useState("");
  const [emailCadastro, setEmailCadastro] = useState("");
  const [codigoVerificacao, setCodigoVerificacao] = useState("");
  const [codigoEnviado, setCodigoEnviado] = useState("");

  const [username, setUsername] = useState("");
  const [handle, setHandle] = useState("");
  const [senha, setSenha] = useState("");

  const [login, setLogin] = useState("");
  const [senhaLogin, setSenhaLogin] = useState("");
  const [lembrarMe, setLembrarMe] = useState(true);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  function limparAvisos() {
    setErro("");
    setSucesso("");
  }

  function salvarSessao(usuario) {
    if (lembrarMe) {
      localStorage.setItem("usuarioLogado", JSON.stringify(usuario));
      localStorage.setItem("lembrarMe", "true");
      sessionStorage.removeItem("usuarioLogado");
    } else {
      sessionStorage.setItem("usuarioLogado", JSON.stringify(usuario));
      localStorage.removeItem("usuarioLogado");
      localStorage.removeItem("lembrarMe");
    }
  }

  function resetarFormularios() {
    setTelefoneCadastro("");
    setEmailCadastro("");
    setCodigoVerificacao("");
    setCodigoEnviado("");
    setIdentidadeVerificada(null);
    setUsername("");
    setHandle("");
    setSenha("");
    setLogin("");
    setSenhaLogin("");
    limparAvisos();
  }

  function voltarParaLogin() {
    resetarFormularios();
    setMetodoCadastro("sms");
    setEtapa("login");
  }

  function enviarCodigoVerificacao() {
    limparAvisos();

    const telefoneLimpo = onlyDigits(telefoneCadastro);
    const emailLimpo = emailCadastro.trim().toLowerCase();

    if (metodoCadastro === "sms" && telefoneLimpo.length < 10) {
      setErro("Digite um numero de celular valido.");
      return;
    }

    if (metodoCadastro === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      setErro("Digite um email valido.");
      return;
    }

    const usuarios = getUsuarios();
    const identityKey = metodoCadastro === "sms" ? `tel_${telefoneLimpo}` : emailLimpo;
    const jaExiste = usuarios.find((u) => {
      const email = (u.email || "").toLowerCase();
      const telefone = onlyDigits(u.telefone || "");
      return email === identityKey || (metodoCadastro === "sms" && telefone === telefoneLimpo);
    });

    if (jaExiste) {
      setErro("Essa conta ja existe. Entre pelo login ou pelo Google.");
      return;
    }

    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    setCodigoEnviado(codigo);
    setCodigoVerificacao("");
    setIdentidadeVerificada({
      metodo: metodoCadastro,
      email: metodoCadastro === "email" ? emailLimpo : identityKey,
      telefone: metodoCadastro === "sms" ? telefoneCadastro.trim() : "",
      contato: metodoCadastro === "sms" ? telefoneCadastro.trim() : emailLimpo,
      provider: metodoCadastro,
    });
    setSucesso(
      metodoCadastro === "sms"
        ? `SMS enviado para ${telefoneCadastro.trim()}.`
        : `Codigo enviado para ${emailLimpo}.`
    );
    setEtapa("verificacao");
  }

  function verificarCodigo() {
    limparAvisos();

    if (codigoVerificacao.trim() !== codigoEnviado) {
      setErro("Codigo incorreto. Confira e tente de novo.");
      return;
    }

    setSucesso("Conta verificada. Agora crie seu usuario.");
    setEtapa("criarPerfil");
  }

  function finalizarCadastro() {
    limparAvisos();

    const nomeLimpo = username.trim();
    const handleLimpo = normalizeHandle(handle);

    if (!identidadeVerificada) {
      setErro("Verifique seu email, celular ou Google antes de finalizar.");
      setEtapa("escolherCadastro");
      return;
    }

    if (!nomeLimpo || !handleLimpo || !senha) {
      setErro("Preencha nome, @ e senha para finalizar.");
      return;
    }

    if (handleLimpo.length < 3) {
      setErro("O @ precisa ter pelo menos 3 caracteres.");
      return;
    }

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    const usuarios = getUsuarios();
    const jaExiste = usuarios.find((u) => {
      const email = (u.email || "").toLowerCase();
      const userHandle = (u.handle || "").toLowerCase();
      return email === identidadeVerificada.email.toLowerCase() || userHandle === handleLimpo;
    });

    if (jaExiste) {
      setErro("Esse email/celular ou @ ja esta cadastrado.");
      return;
    }

    const novoUsuario = createBaseUser({
      username: nomeLimpo,
      handle: handleLimpo,
      email: identidadeVerificada.email,
      senha,
      telefone: identidadeVerificada.telefone,
      authProvider: identidadeVerificada.provider,
      verificado: true,
    });

    const atualizados = [...usuarios, novoUsuario];
    localStorage.setItem("usuarios", JSON.stringify(atualizados));
    localStorage.setItem("usuarioLogado", JSON.stringify(novoUsuario));
    localStorage.setItem("lembrarMe", "true");
    sessionStorage.removeItem("usuarioLogado");

    resetarFormularios();
    onLogin();
  }

  function entrarComGoogle() {
    limparAvisos();

    const usuarios = getUsuarios();
    const usuarioGoogle = usuarios.find((u) => (u.email || "").toLowerCase() === GOOGLE_EMAIL);

    if (usuarioGoogle) {
      salvarSessao(usuarioGoogle);
      resetarFormularios();
      onLogin();
      return;
    }

    setIdentidadeVerificada({
      metodo: "google",
      email: GOOGLE_EMAIL,
      telefone: "",
      contato: "Conta Google conectada",
      provider: "google",
    });
    setUsername("Usuario Google");
    setMetodoCadastro("google");
    setSucesso("Google conectado. Complete seu perfil para continuar.");
    setEtapa("criarPerfil");
  }

  function entrarComEmail() {
    limparAvisos();

    if (!login.trim() || !senhaLogin) {
      setErro("Digite email, usuario ou @ e a senha.");
      return;
    }

    const { usuarios, admin } = ensureAdminUser();
    const loginLimpo = normalizeHandle(login.trim());
    const loginEmail = login.trim().toLowerCase();

    const usuarioEncontrado =
      loginEmail === ADMIN_EMAIL || loginLimpo === "allzynadm" || loginLimpo === ADMIN_HANDLE
        ? admin
        : usuarios.find((u) => {
            const email = (u.email || "").toLowerCase();
            const userHandle = (u.handle || "").toLowerCase();
            const userName = (u.username || "").toLowerCase();
            return email === loginEmail || userHandle === loginLimpo || userName === login.trim().toLowerCase();
          });

    if (!usuarioEncontrado) {
      setErro("Usuario nao encontrado.");
      return;
    }

    if (!usuarioEncontrado.senha || usuarioEncontrado.senha !== senhaLogin) {
      setErro("Senha incorreta.");
      return;
    }

    salvarSessao(usuarioEncontrado);
    resetarFormularios();
    onLogin();
  }

  return (
    <div className="container login-page">
      <div className="left">
        <img src={logo} alt="DevSpace" />
        <h2>Faca login e entre para o nosso time!</h2>
      </div>

      <div className="right">
        {etapa === "login" && (
          <form
            className="card auth-card"
            onSubmit={(e) => {
              e.preventDefault();
              entrarComEmail();
            }}
          >
            <h3>Entrar no DevSpace</h3>

            <input
              type="text"
              placeholder="Email, usuario ou @"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />

            <input
              type="password"
              placeholder="Senha"
              value={senhaLogin}
              onChange={(e) => setSenhaLogin(e.target.value)}
            />

            <label className="lembrar-me">
              <input
                type="checkbox"
                checked={lembrarMe}
                onChange={(e) => setLembrarMe(e.target.checked)}
              />
              Lembrar-me neste dispositivo
            </label>

            {erro && <p className="erro">{erro}</p>}
            {sucesso && <p className="sucesso">{sucesso}</p>}

            <button type="submit" className="btn-entrar">
              Entrar
            </button>

            <hr className="divisor" />

            <button type="button" className="btn-google" onClick={entrarComGoogle}>
              Entrar com Google
            </button>

            <p className="toggle-cadastro">
              Nao tem conta?{" "}
              <button type="button" onClick={() => setEtapa("escolherCadastro")} className="link-btn">
                Cadastre-se
              </button>
            </p>
          </form>
        )}

        {etapa === "escolherCadastro" && (
          <form className="card auth-card cadastro-card" onSubmit={(e) => e.preventDefault()}>
            <h3>Criar conta</h3>
            <p className="descricao">Escolha uma forma de confirmar que a conta e sua.</p>

            <div className="metodos-grid">
              <button
                type="button"
                className={metodoCadastro === "sms" ? "auth-option active" : "auth-option"}
                onClick={() => {
                  setMetodoCadastro("sms");
                  limparAvisos();
                }}
              >
                <strong>Celular</strong>
                <span>Receba um codigo por SMS.</span>
              </button>

              <button
                type="button"
                className={metodoCadastro === "email" ? "auth-option active" : "auth-option"}
                onClick={() => {
                  setMetodoCadastro("email");
                  limparAvisos();
                }}
              >
                <strong>Email</strong>
                <span>Receba um codigo no email.</span>
              </button>
            </div>

            {metodoCadastro === "sms" && (
              <div className="metodo-form">
                <input
                  type="tel"
                  placeholder="Celular com DDD"
                  value={telefoneCadastro}
                  onChange={(e) => setTelefoneCadastro(e.target.value)}
                />
              </div>
            )}

            {metodoCadastro === "email" && (
              <div className="metodo-form">
                <input
                  type="email"
                  placeholder="Email"
                  value={emailCadastro}
                  onChange={(e) => setEmailCadastro(e.target.value)}
                />
              </div>
            )}

            {erro && <p className="erro">{erro}</p>}
            {sucesso && <p className="sucesso">{sucesso}</p>}

            <button type="button" className="btn-entrar" onClick={enviarCodigoVerificacao}>
              Enviar codigo
            </button>

            <button type="button" className="btn-google" onClick={entrarComGoogle}>
              Continuar com Google
            </button>

            <button type="button" className="btn-voltar" onClick={voltarParaLogin}>
              Voltar
            </button>
          </form>
        )}

        {etapa === "verificacao" && (
          <form
            className="card auth-card"
            onSubmit={(e) => {
              e.preventDefault();
              verificarCodigo();
            }}
          >
            <h3>Confirmar codigo</h3>

            <p className="descricao">
              Enviamos um codigo para {identidadeVerificada?.contato || "seu contato"}.
            </p>

            <div className="codigo-teste">Codigo de teste: {codigoEnviado}</div>

            <input
              type="text"
              inputMode="numeric"
              placeholder="Codigo de 6 digitos"
              value={codigoVerificacao}
              onChange={(e) => setCodigoVerificacao(onlyDigits(e.target.value))}
              maxLength="6"
            />

            {erro && <p className="erro">{erro}</p>}
            {sucesso && <p className="sucesso">{sucesso}</p>}

            <button type="submit" className="btn-entrar">
              Confirmar
            </button>

            <button type="button" className="btn-voltar" onClick={() => setEtapa("escolherCadastro")}>
              Trocar metodo
            </button>
          </form>
        )}

        {etapa === "criarPerfil" && (
          <form
            className="card auth-card cadastro-card"
            onSubmit={(e) => {
              e.preventDefault();
              finalizarCadastro();
            }}
          >
            <h3>Complete seu perfil</h3>
            <p className="descricao">
              {identidadeVerificada?.provider === "google"
                ? "Google conectado. Agora escolha seu nome, @ e senha."
                : "Conta verificada. Agora escolha seu nome, @ e senha."}
            </p>

            <input
              type="text"
              placeholder="Nome"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              type="text"
              placeholder="@usuario"
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/\s+/g, ""))}
            />

            <input
              type="password"
              placeholder="Criar senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />

            {erro && <p className="erro">{erro}</p>}
            {sucesso && <p className="sucesso">{sucesso}</p>}

            <button type="submit" className="btn-entrar">
              Finalizar cadastro
            </button>

            <button type="button" className="btn-voltar" onClick={voltarParaLogin}>
              Cancelar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
