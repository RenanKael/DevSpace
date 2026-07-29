import { useState } from "react";
import "../style/login.css";
import logo from "../assets/IMGS/Black-DevSpace-removebg-preview.png";
import { loginUser, registerUser } from "../api";

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
    estrelas: 0,
    avaliacao: 0,
    starStats: {
      postsCreated: 0,
      commentsMade: 0,
      firstPostAwarded: false,
    },
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
  const [alterarLogin, setAlterarLogin] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");

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
    setAlterarLogin("");
    setSenhaAtual("");
    setNovoEmail("");
    setNovaSenha("");
    setConfirmarNovaSenha("");
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

  async function finalizarCadastro() {
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

    try {
      const createdUser = await registerUser({
        username: novoUsuario.username,
        handle: novoUsuario.handle,
        email: novoUsuario.email,
        senha: novoUsuario.senha,
        telefone: novoUsuario.telefone,
        bio: novoUsuario.bio,
        fotoPerfil: novoUsuario.fotoPerfil,
        fotoCapa: novoUsuario.fotoCapa,
      });

      salvarSessao(createdUser);
      resetarFormularios();
      onLogin();
    } catch (error) {
      setErro(error.message || "Erro ao registrar o usuario.");
    }
  }

  function encontrarUsuarioPorLogin(usuarios, valor) {
    const loginLimpo = normalizeHandle(valor.trim());
    const loginEmail = valor.trim().toLowerCase();

    return usuarios.find((u) => {
      const email = (u.email || "").toLowerCase();
      const userHandle = (u.handle || "").toLowerCase();
      const userName = (u.username || "").toLowerCase();
      return email === loginEmail || userHandle === loginLimpo || userName === valor.trim().toLowerCase();
    });
  }

  function sincronizarEmailNosPosts(emailAnterior, usuarioAtualizado) {
    const posts = JSON.parse(localStorage.getItem("posts")) || [];
    const antigoEmail = (emailAnterior || "").toLowerCase();
    if (!antigoEmail) return;

    const postsAtualizados = posts.map((post) => {
      const postDoUsuario = (post.email || "").toLowerCase() === antigoEmail;
      const commentsList = Array.isArray(post.commentsList)
        ? post.commentsList.map((comment) =>
            (comment.email || "").toLowerCase() === antigoEmail
              ? {
                  ...comment,
                  email: usuarioAtualizado.email,
                }
              : comment
          )
        : [];

      return {
        ...post,
        ...(postDoUsuario ? { email: usuarioAtualizado.email } : {}),
        commentsList,
      };
    });

    localStorage.setItem("posts", JSON.stringify(postsAtualizados));
    window.dispatchEvent(new CustomEvent("devspacePostsUpdated", { detail: { sameTab: true } }));
  }

  function alterarAcesso() {
    limparAvisos();

    if (!alterarLogin.trim() || !senhaAtual) {
      setErro("Informe sua conta atual e sua senha atual.");
      return;
    }

    const emailLimpo = novoEmail.trim().toLowerCase();
    const senhaLimpa = novaSenha.trim();

    if (!emailLimpo && !senhaLimpa) {
      setErro("Digite um novo email, uma nova senha ou os dois.");
      return;
    }

    if (emailLimpo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      setErro("Digite um novo email valido.");
      return;
    }

    if (senhaLimpa && senhaLimpa.length < 6) {
      setErro("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (senhaLimpa && senhaLimpa !== confirmarNovaSenha) {
      setErro("A confirmacao da nova senha nao bate.");
      return;
    }

    const usuarios = getUsuarios();
    const usuarioEncontrado = encontrarUsuarioPorLogin(usuarios, alterarLogin);

    if (!usuarioEncontrado) {
      setErro("Usuario nao encontrado.");
      return;
    }

    if (!usuarioEncontrado.senha || usuarioEncontrado.senha !== senhaAtual) {
      setErro("Senha atual incorreta.");
      return;
    }

    const emailAnterior = usuarioEncontrado.email;
    const emailEmUso = emailLimpo && usuarios.some((u) =>
      (u.email || "").toLowerCase() === emailLimpo &&
      (u.email || "").toLowerCase() !== (usuarioEncontrado.email || "").toLowerCase()
    );

    if (emailEmUso) {
      setErro("Esse email ja esta em uso por outra conta.");
      return;
    }

    const usuarioAtualizado = {
      ...usuarioEncontrado,
      email: emailLimpo || usuarioEncontrado.email,
      senha: senhaLimpa || usuarioEncontrado.senha,
    };

    const atualizados = usuarios.map((u) =>
      (u.email || "").toLowerCase() === (usuarioEncontrado.email || "").toLowerCase()
        ? usuarioAtualizado
        : u
    );

    localStorage.setItem("usuarios", JSON.stringify(atualizados));
    sincronizarEmailNosPosts(emailAnterior, usuarioAtualizado);

    const localUser = JSON.parse(localStorage.getItem("usuarioLogado"));
    const sessionUser = JSON.parse(sessionStorage.getItem("usuarioLogado"));
    const atualizaSessao = (u) =>
      u && (u.email || "").toLowerCase() === (emailAnterior || "").toLowerCase();

    if (atualizaSessao(localUser)) {
      localStorage.setItem("usuarioLogado", JSON.stringify(usuarioAtualizado));
    }
    if (atualizaSessao(sessionUser)) {
      sessionStorage.setItem("usuarioLogado", JSON.stringify(usuarioAtualizado));
    }

    setLogin(usuarioAtualizado.email || usuarioAtualizado.handle || usuarioAtualizado.username || "");
    setSenhaLogin("");
    setAlterarLogin("");
    setSenhaAtual("");
    setNovoEmail("");
    setNovaSenha("");
    setConfirmarNovaSenha("");
    setSucesso("Acesso atualizado. Entre com os novos dados.");
    setEtapa("login");
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

  async function entrarComEmail() {
    limparAvisos();

    if (!login.trim() || !senhaLogin) {
      setErro("Digite email, usuario ou @ e a senha.");
      return;
    }

    try {
      const user = await loginUser(login.trim(), senhaLogin);
      salvarSessao(user);
      resetarFormularios();
      onLogin();
    } catch (error) {
      setErro(error.message || "Erro ao entrar. Verifique suas credenciais.");
    }
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

            <p className="toggle-cadastro">
              Quer mudar seu acesso?{" "}
              <button
                type="button"
                onClick={() => {
                  limparAvisos();
                  setAlterarLogin(login);
                  setEtapa("alterarAcesso");
                }}
                className="link-btn"
              >
                Alterar email ou senha
              </button>
            </p>
          </form>
        )}

        {etapa === "alterarAcesso" && (
          <form
            className="card auth-card cadastro-card"
            onSubmit={(e) => {
              e.preventDefault();
              alterarAcesso();
            }}
          >
            <h3>Alterar acesso</h3>
            <p className="descricao">Confirme sua conta atual e defina o que deseja mudar.</p>

            <input
              type="text"
              placeholder="Email, usuario ou @ atual"
              value={alterarLogin}
              onChange={(e) => setAlterarLogin(e.target.value)}
            />

            <input
              type="password"
              placeholder="Senha atual"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
            />

            <input
              type="email"
              placeholder="Novo email (opcional)"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Nova senha (opcional)"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
            />

            <input
              type="password"
              placeholder="Confirmar nova senha"
              value={confirmarNovaSenha}
              onChange={(e) => setConfirmarNovaSenha(e.target.value)}
              disabled={!novaSenha.trim()}
            />

            {erro && <p className="erro">{erro}</p>}
            {sucesso && <p className="sucesso">{sucesso}</p>}

            <button type="submit" className="btn-entrar">
              Salvar novo acesso
            </button>

            <button type="button" className="btn-voltar cadastro-voltar" onClick={voltarParaLogin}>
              Voltar
            </button>
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

            <button type="button" className="btn-voltar cadastro-voltar" onClick={voltarParaLogin}>
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

            <button type="button" className="btn-voltar cadastro-voltar" onClick={() => setEtapa("escolherCadastro")}>
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
              placeholder="Nome de usuario"
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

            <button type="button" className="btn-voltar cadastro-voltar" onClick={voltarParaLogin}>
              Cancelar
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
