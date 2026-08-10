import { useEffect, useRef, useState } from "react";
import "../style/login.css";
import logo from "../assets/IMGS/Black-DevSpace-removebg-preview.png";
import backArrow from "../assets/IMGS/DawnFlech (2).png";
import { GoogleMark } from "../components/icons";
import {
  loginUser,
  registerUser,
  loginGoogle,
  checkAuthAvailability,
  resetPasswordApi,
  requestPasswordReset,
  sendVerificationCode,
  unwrapAuthPayload,
} from "../api";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function getUsuarios() {
  return JSON.parse(localStorage.getItem("usuarios")) || [];
}

function normalizeHandle(value) {
  return value.replace(/^@+/, "").replace(/\s+/g, "").toLowerCase();
}

function onlyDigits(value) {
  return value.replace(/\D/g, "");
}

function suggestHandle(email, name) {
  const fromEmail = normalizeHandle(String(email || "").split("@")[0] || "");
  if (/^[a-z0-9._]{3,30}$/.test(fromEmail)) return fromEmail;
  const fromName = normalizeHandle(String(name || "").replace(/\s+/g, "."));
  if (/^[a-z0-9._]{3,30}$/.test(fromName)) return fromName.slice(0, 30);
  return "";
}

export default function Login({ onLogin, onVoltar }) {
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
  const [disponivelContratacao, setDisponivelContratacao] = useState(false);

  const [login, setLogin] = useState("");
  const [senhaLogin, setSenhaLogin] = useState("");
  const [lembrarMe, setLembrarMe] = useState(true);

  const [recSenhaContato, setRecSenhaContato] = useState("");
  const [recSenhaCodigoEnviado, setRecSenhaCodigoEnviado] = useState("");
  const [recSenhaCodigoDigitado, setRecSenhaCodigoDigitado] = useState("");
  const [recSenhaUsuario, setRecSenhaUsuario] = useState(null);
  const [recSenhaNovaSenha, setRecSenhaNovaSenha] = useState("");
  const [recSenhaConfirmarSenha, setRecSenhaConfirmarSenha] = useState("");

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [enviando, setEnviando] = useState(false);

  const tokenClientRef = useRef(null);

  function limparAvisos() {
    setErro("");
    setSucesso("");
  }

  // Tenta salvar; se o storage estiver cheio (comum com foto/capa em base64
  // acumuladas), libera espaco removendo cache que pode ser buscado nvamente
  // do backend, e so em ultimo caso salva sem foto/capa (evita travar o login).
  function salvarComResiliencia(storage, chave, usuario) {
    const salvarTentativa = (dados) => {
      try {
        storage.setItem(chave, JSON.stringify(dados));
        return true;
      } catch {
        return false;
      }
    };

    if (salvarTentativa(usuario)) return;

    try {
      localStorage.removeItem("posts");
    } catch {
      // ignora
    }
    if (salvarTentativa(usuario)) return;

    const { fotoPerfil: _fotoPerfil, fotoCapa: _fotoCapa, ...usuarioSemFotos } = usuario;
    salvarTentativa(usuarioSemFotos);
  }

  function salvarSessao(usuario) {
    if (!usuario) return;
    if (lembrarMe) {
      salvarComResiliencia(localStorage, "usuarioLogado", usuario);
      try {
        localStorage.setItem("lembrarMe", "true");
      } catch {
        // ignora
      }
      sessionStorage.removeItem("usuarioLogado");
    } else {
      salvarComResiliencia(sessionStorage, "usuarioLogado", usuario);
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
    setDisponivelContratacao(false);
    setLogin("");
    setSenhaLogin("");
    setRecSenhaContato("");
    setRecSenhaCodigoEnviado("");
    setRecSenhaCodigoDigitado("");
    setRecSenhaUsuario(null);
    setRecSenhaNovaSenha("");
    setRecSenhaConfirmarSenha("");
    limparAvisos();
  }

  function voltarParaLogin() {
    resetarFormularios();
    setMetodoCadastro("sms");
    setEtapa("login");
  }

  async function enviarCodigoVerificacao() {
    limparAvisos();

    const telefoneLimpo = onlyDigits(telefoneCadastro);
    const emailLimpo = emailCadastro.trim().toLowerCase();

    if (metodoCadastro === "sms" && telefoneLimpo.length < 10) {
      setErro("Digite um número de celular válido.");
      return;
    }

    if (metodoCadastro === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) {
      setErro("Digite um e-mail válido.");
      return;
    }

    try {
      const disponibilidade = await checkAuthAvailability({
        email: metodoCadastro === "email" ? emailLimpo : "",
        telefone: metodoCadastro === "sms" ? telefoneLimpo : "",
      });

      if (disponibilidade.emailTaken || disponibilidade.telefoneTaken) {
        setErro("Essa conta já existe. Entre pelo login ou pelo Google.");
        return;
      }
    } catch (error) {
      setErro(error.message || "Não foi possível verificar a conta. Tente novamente.");
      return;
    }

    try {
      setEnviando(true);
      const resposta = await sendVerificationCode({
        email: metodoCadastro === "email" ? emailLimpo : "",
        telefone: metodoCadastro === "sms" ? telefoneLimpo : "",
      });
      const codigo = resposta?.codigo || "";
      setCodigoEnviado(codigo);
      setCodigoVerificacao("");
      setIdentidadeVerificada({
        metodo: metodoCadastro,
        email: metodoCadastro === "email" ? emailLimpo : "",
        telefone: metodoCadastro === "sms" ? telefoneLimpo : "",
        contato: metodoCadastro === "sms" ? telefoneCadastro.trim() : emailLimpo,
        provider: metodoCadastro,
      });
      setSucesso(codigo ? `Use o código ${codigo} para continuar.` : "Use o código enviado para continuar.");
      setEtapa("verificacao");
    } catch (error) {
      setErro(error.message || "Não foi possível enviar o código. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  function verificarCodigo() {
    limparAvisos();

    if (codigoVerificacao.trim() !== codigoEnviado) {
      setErro("Código incorreto. Confira e tente de novo.");
      return;
    }

    setEtapa("criarPerfil");
  }

  async function finalizarCadastro() {
    limparAvisos();

    const handleLimpo = normalizeHandle(handle);
    const isGoogle = identidadeVerificada?.provider === "google";
    const nomeLimpo = isGoogle
      ? (username.trim() || identidadeVerificada?.nome || handleLimpo)
      : username.trim();

    if (!identidadeVerificada) {
      setErro("Verifique seu email, celular ou Google antes de finalizar.");
      setEtapa("escolherCadastro");
      return;
    }

    if (!handleLimpo || (!isGoogle && (!nomeLimpo || !senha))) {
      setErro(isGoogle ? "Escolha seu @ para finalizar." : "Preencha nome, @ e senha para finalizar.");
      return;
    }

    if (handleLimpo.length < 3) {
      setErro("O @ precisa ter pelo menos 3 caracteres.");
      return;
    }

    if (!/^[a-z0-9._]{3,30}$/.test(handleLimpo)) {
      setErro("O @ deve ter 3-30 caracteres (letras, números, . ou _).");
      return;
    }

    if (!isGoogle && senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setEnviando(true);
    try {
      const disponibilidade = await checkAuthAvailability({
        email: identidadeVerificada.email,
        handle: handleLimpo,
        telefone: identidadeVerificada.telefone,
      });

      if (disponibilidade.handleTaken) {
        setErro("Esse @ já está cadastrado.");
        return;
      }
      if (disponibilidade.emailTaken || disponibilidade.telefoneTaken) {
        setErro("Esse email/celular já está cadastrado.");
        return;
      }

      const createdUser = unwrapAuthPayload(
        await registerUser({
          username: nomeLimpo,
          handle: handleLimpo,
          email: identidadeVerificada.email,
          senha,
          telefone: identidadeVerificada.telefone,
          bio: "",
          fotoPerfil: identidadeVerificada.foto || "",
          fotoCapa: "",
          disponivelContratacao,
          authProvider: identidadeVerificada.provider,
          codigo: codigoEnviado,
          accessToken: identidadeVerificada.accessToken || "",
        }),
        lembrarMe
      );

      const usuariosLocais = getUsuarios();
      localStorage.setItem("usuarios", JSON.stringify([...usuariosLocais, createdUser]));

      salvarSessao(createdUser);
      resetarFormularios();
      onLogin();
    } catch (error) {
      setErro(error.message || "Erro ao registrar o usuário.");
    } finally {
      setEnviando(false);
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

  function iniciarRecuperacaoSenha() {
    limparAvisos();
    setRecSenhaContato(login);
    setEtapa("esqueciSenha");
  }

  async function enviarCodigoRecuperacao() {
    limparAvisos();

    const contatoLimpo = recSenhaContato.trim();
    if (!contatoLimpo) {
      setErro("Informe seu e-mail, usuário ou @.");
      return;
    }

    const usuarios = getUsuarios();
    const usuarioEncontrado = encontrarUsuarioPorLogin(usuarios, contatoLimpo);

    try {
      setEnviando(true);
      const resposta = await requestPasswordReset(contatoLimpo);
      const codigo = resposta?.codigo || "";
      setRecSenhaUsuario(usuarioEncontrado || { email: contatoLimpo, username: contatoLimpo, handle: contatoLimpo });
      setRecSenhaCodigoEnviado(codigo);
      setRecSenhaCodigoDigitado("");
      setSucesso(codigo ? `Use o código ${codigo} para continuar.` : "Se a conta existir, use o código para continuar.");
      setEtapa("esqueciSenhaCodigo");
    } catch (error) {
      setErro(error.message || "Não foi possível enviar o código. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  function confirmarCodigoRecuperacao() {
    limparAvisos();

    if (recSenhaCodigoDigitado.trim() !== recSenhaCodigoEnviado) {
      setErro("Código incorreto. Confira e tente de novo.");
      return;
    }

    setSucesso("Código confirmado. Escolha sua nova senha.");
    setEtapa("esqueciSenhaNova");
  }

  async function salvarNovaSenhaRecuperada() {
    limparAvisos();

    if (recSenhaNovaSenha.length < 6) {
      setErro("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (recSenhaNovaSenha !== recSenhaConfirmarSenha) {
      setErro("A confirmação da nova senha não bate.");
      return;
    }

    try {
      setEnviando(true);
      await resetPasswordApi(recSenhaContato.trim(), recSenhaNovaSenha, recSenhaCodigoEnviado);
    } catch (error) {
      setErro(error.message || "Não foi possível redefinir a senha. Tente novamente.");
      setEnviando(false);
      return;
    }

    // Mantem tambem a copia local em dia (contas antigas local-only).
    const usuarios = getUsuarios();
    const atualizados = usuarios.map((u) =>
      (u.email || "").toLowerCase() === (recSenhaUsuario?.email || "").toLowerCase()
        ? { ...u, senha: recSenhaNovaSenha }
        : u
    );
    localStorage.setItem("usuarios", JSON.stringify(atualizados));

    setLogin(recSenhaUsuario?.email || recSenhaUsuario?.handle || recSenhaContato);
    setSenhaLogin("");
    setRecSenhaContato("");
    setRecSenhaCodigoEnviado("");
    setRecSenhaCodigoDigitado("");
    setRecSenhaUsuario(null);
    setRecSenhaNovaSenha("");
    setRecSenhaConfirmarSenha("");
    setSucesso("Senha redefinida. Entre com a nova senha.");
    setEtapa("login");
    setEnviando(false);
  }

  async function processarLoginGoogle(accessToken) {
    limparAvisos();

    if (!accessToken) {
      setErro("A conta Google não retornou um token válido.");
      return;
    }

    try {
      const resultado = await loginGoogle(accessToken);

      if (!resultado?.needsProfile) {
        salvarSessao(unwrapAuthPayload(resultado, lembrarMe));
        resetarFormularios();
        onLogin();
        return;
      }

      const perfilGoogle = resultado.profile || {};
      const emailGoogle = (perfilGoogle.email || "").toLowerCase();
      if (!emailGoogle) {
        setErro("A conta Google não retornou um e-mail válido.");
        return;
      }

      setIdentidadeVerificada({
        metodo: "google",
        email: emailGoogle,
        nome: perfilGoogle.name || "",
        telefone: "",
        contato: emailGoogle,
        provider: "google",
        accessToken,
        googleId: perfilGoogle.googleId || "",
        foto: perfilGoogle.picture || "",
      });
      setUsername(perfilGoogle.name || "");
      setHandle(suggestHandle(emailGoogle, perfilGoogle.name || ""));
      setSenha("");
      setMetodoCadastro("google");
      setEtapa("criarPerfil");
    } catch (error) {
      setErro(error.message || "Não foi possível falar com o servidor. Tente novamente.");
    }
  }

  function entrarComGoogle() {
    limparAvisos();

    if (!GOOGLE_CLIENT_ID) {
      setErro("Login com Google não configurado (falta VITE_GOOGLE_CLIENT_ID).");
      return;
    }

    if (!tokenClientRef.current) {
      setErro("Serviço do Google ainda está carregando, tente novamente em instantes.");
      return;
    }

    tokenClientRef.current.requestAccessToken();
  }

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    function iniciarTokenClient() {
      if (!window.google?.accounts?.oauth2) return;

      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "openid email profile",
        callback: async (resposta) => {
          if (resposta.error) {
            setErro("Não foi possível conectar com o Google.");
            return;
          }

          try {
            await processarLoginGoogle(resposta.access_token);
          } catch {
            setErro("Falha ao obter os dados da conta Google.");
          }
        },
      });
    }

    if (window.google?.accounts?.oauth2) {
      iniciarTokenClient();
      return;
    }

    const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
    script?.addEventListener("load", iniciarTokenClient);
    return () => script?.removeEventListener("load", iniciarTokenClient);
  }, []);

  async function entrarComEmail() {
    limparAvisos();

    if (!login.trim() || !senhaLogin) {
      setErro("Digite email, usuário ou @ e a senha.");
      return;
    }

    try {
      setEnviando(true);
      const user = unwrapAuthPayload(await loginUser(login.trim(), senhaLogin), lembrarMe);
      salvarSessao(user);
      resetarFormularios();
      onLogin();
    } catch (error) {
      setErro(error.message || "Erro ao entrar. Verifique suas credenciais.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="container login-page">
      {onVoltar && (
        <button
          type="button"
          className="login-back-btn"
          onClick={onVoltar}
          title="Voltar para o feed"
          aria-label="Voltar para o feed"
        >
          <img src={backArrow} alt="" />
        </button>
      )}
      <div className="login-shell">
      <div className="left">
        <div className="login-hero">
          <img src={logo} alt="DevSpace" />
          <h2>Faça login e entre para o nosso <span className="hero-accent">time</span>!</h2>
          <p className="login-hero-tagline">Rede social pra quem cria, testa e posta projeto.</p>
          <p className="login-hero-kicker">Crie · compartilhe · evolua</p>
        </div>
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

            <div className="auth-field">
              <label className="auth-label" htmlFor="login-identificador">Email, usuário ou @</label>
              <input
                id="login-identificador"
                type="text"
                autoComplete="username"
                placeholder="Email, usuário ou @"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                disabled={enviando}
                aria-invalid={!!erro}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="login-senha">Senha</label>
              <input
                id="login-senha"
                type="password"
                autoComplete="current-password"
                placeholder="Senha"
                value={senhaLogin}
                onChange={(e) => setSenhaLogin(e.target.value)}
                disabled={enviando}
                aria-invalid={!!erro}
              />
            </div>

            <div className="login-options">
              <label className="lembrar-me">
                <input
                  type="checkbox"
                  checked={lembrarMe}
                  onChange={(e) => setLembrarMe(e.target.checked)}
                />
                <span>Lembrar-me neste dispositivo</span>
              </label>

              <button type="button" className="esqueci-senha-btn" onClick={iniciarRecuperacaoSenha}>
                Esqueci a senha
              </button>
            </div>

            {erro && <p className="erro">{erro}</p>}
            {sucesso && <p className="sucesso">{sucesso}</p>}

            <button type="submit" className="btn-entrar" disabled={enviando}>
              {enviando ? "Entrando..." : "Entrar"}
            </button>

            <hr className="divisor" />

            <button type="button" className="btn-google" onClick={entrarComGoogle}>
              <GoogleMark size={22} className="google-icon" />
              Entrar com Google
            </button>

            <p className="toggle-cadastro">
              Não tem conta?{" "}
              <button
                type="button"
                onClick={() => {
                  limparAvisos();
                  setEtapa("escolherCadastro");
                }}
                className="link-btn"
              >
                Cadastre-se
              </button>
            </p>
          </form>
        )}

        {etapa === "esqueciSenha" && (
          <form
            className="card auth-card cadastro-card"
            onSubmit={(e) => {
              e.preventDefault();
              enviarCodigoRecuperacao();
            }}
          >
            <h3>Esqueci minha senha</h3>
            <p className="descricao">Informe sua conta para receber um código de verificação.</p>

            <input
              type="text"
              placeholder="Email, usuário ou @"
              value={recSenhaContato}
              onChange={(e) => setRecSenhaContato(e.target.value)}
            />

            {erro && <p className="erro">{erro}</p>}
            {sucesso && <p className="sucesso">{sucesso}</p>}

            <button type="submit" className="btn-entrar">
              Enviar código
            </button>

            <button type="button" className="btn-voltar cadastro-voltar" onClick={voltarParaLogin}>
              Voltar
            </button>
          </form>
        )}

        {etapa === "esqueciSenhaCodigo" && (
          <form
            className="card auth-card"
            onSubmit={(e) => {
              e.preventDefault();
              confirmarCodigoRecuperacao();
            }}
          >
            <h3>Confirmar código</h3>
            <p className="descricao">Enviamos um código para {recSenhaUsuario?.email}.</p>

            {import.meta.env.DEV && recSenhaCodigoEnviado && (
              <p className="descricao">Em desenvolvimento, o código também aparece no console.</p>
            )}

            <input
              type="text"
              inputMode="numeric"
              placeholder="Código de 6 dígitos"
              value={recSenhaCodigoDigitado}
              onChange={(e) => setRecSenhaCodigoDigitado(onlyDigits(e.target.value))}
              maxLength="6"
            />

            {erro && <p className="erro">{erro}</p>}
            {sucesso && <p className="sucesso">{sucesso}</p>}

            <button type="submit" className="btn-entrar">
              Confirmar
            </button>

            <button type="button" className="btn-voltar cadastro-voltar" onClick={voltarParaLogin}>
              Cancelar
            </button>
          </form>
        )}

        {etapa === "esqueciSenhaNova" && (
          <form
            className="card auth-card"
            onSubmit={(e) => {
              e.preventDefault();
              salvarNovaSenhaRecuperada();
            }}
          >
            <h3>Nova senha</h3>
            <p className="descricao">Escolha uma nova senha para {recSenhaUsuario?.username}.</p>

            <input
              type="password"
              placeholder="Nova senha"
              value={recSenhaNovaSenha}
              onChange={(e) => setRecSenhaNovaSenha(e.target.value)}
            />

            <input
              type="password"
              placeholder="Confirmar nova senha"
              value={recSenhaConfirmarSenha}
              onChange={(e) => setRecSenhaConfirmarSenha(e.target.value)}
            />

            {erro && <p className="erro">{erro}</p>}
            {sucesso && <p className="sucesso">{sucesso}</p>}

            <button type="submit" className="btn-entrar">
              Salvar nova senha
            </button>

            <button type="button" className="btn-voltar cadastro-voltar" onClick={voltarParaLogin}>
              Cancelar
            </button>
          </form>
        )}

        {etapa === "escolherCadastro" && (
          <form className="card auth-card cadastro-card" onSubmit={(e) => e.preventDefault()}>
            <h3>Criar conta</h3>
            <p className="descricao">Escolha uma forma de confirmar que a conta é sua.</p>

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
                <span>O código aparece na tela para você continuar.</span>
              </button>

              <button
                type="button"
                className={metodoCadastro === "email" ? "auth-option active" : "auth-option"}
                onClick={() => {
                  setMetodoCadastro("email");
                  limparAvisos();
                }}
              >
                <strong>E-mail</strong>
                <span>O código aparece na tela para você continuar.</span>
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
                  placeholder="E-mail"
                  value={emailCadastro}
                  onChange={(e) => setEmailCadastro(e.target.value)}
                />
              </div>
            )}

            {erro && <p className="erro">{erro}</p>}
            {sucesso && <p className="sucesso">{sucesso}</p>}

            <button type="button" className="btn-entrar" onClick={enviarCodigoVerificacao}>
              Enviar código
            </button>

            <button type="button" className="btn-google" onClick={entrarComGoogle}>
              <GoogleMark size={22} className="google-icon" />
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
            <h3>Confirmar código</h3>

            <p className="descricao">
              Enviamos um código para {identidadeVerificada?.contato || "seu contato"}.
            </p>

            {import.meta.env.DEV && codigoEnviado && (
              <p className="descricao">Em desenvolvimento, o código também aparece no console.</p>
            )}

            <input
              type="text"
              inputMode="numeric"
              placeholder="Código de 6 dígitos"
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
              Trocar método
            </button>
          </form>
        )}

        {etapa === "criarPerfil" && identidadeVerificada?.provider === "google" && (
          <form
            className="card auth-card google-handle-card"
            onSubmit={(e) => {
              e.preventDefault();
              finalizarCadastro();
            }}
          >
            <h3>Escolha seu @</h3>
            <p className="descricao">Sua conta Google já está conectada. Só falta o usuário.</p>

            <div className="google-connected">
              {identidadeVerificada.foto ? (
                <img src={identidadeVerificada.foto} alt="" />
              ) : (
                <GoogleMark size={22} className="google-connected-fallback" />
              )}
              <div>
                <strong>{identidadeVerificada.nome || "Conta Google"}</strong>
                <span>{identidadeVerificada.email}</span>
              </div>
            </div>

            <input
              type="text"
              placeholder="@usuário"
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/\s+/g, ""))}
              autoFocus
            />

            <label className="contrato-toggle">
              <input
                type="checkbox"
                checked={disponivelContratacao}
                onChange={(e) => setDisponivelContratacao(e.target.checked)}
              />
              <span>Quero aparecer como disponível para contratação</span>
            </label>

            {erro && <p className="erro">{erro}</p>}

            <div className="auth-actions">
              <button type="submit" className="btn-entrar">
                Finalizar cadastro
              </button>

              <button type="button" className="btn-voltar" onClick={voltarParaLogin}>
                Cancelar
              </button>
            </div>
          </form>
        )}

        {etapa === "criarPerfil" && identidadeVerificada?.provider !== "google" && (
          <form
            className="card auth-card cadastro-card"
            onSubmit={(e) => {
              e.preventDefault();
              finalizarCadastro();
            }}
          >
            <h3>Complete seu perfil</h3>
            <p className="descricao">Conta verificada. Agora escolha seu nome, @ e senha.</p>

            <input
              type="text"
              placeholder="Nome de usuário"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              type="text"
              placeholder="@usuário"
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/\s+/g, ""))}
            />

            <input
              type="password"
              placeholder="Criar senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />

            <label className="contrato-toggle">
              <input
                type="checkbox"
                checked={disponivelContratacao}
                onChange={(e) => setDisponivelContratacao(e.target.checked)}
              />
              <span>Quero aparecer como disponível para contratação</span>
            </label>

            {erro && <p className="erro">{erro}</p>}

            <div className="auth-actions">
              <button type="submit" className="btn-entrar">
                Finalizar cadastro
              </button>

              <button type="button" className="btn-voltar" onClick={voltarParaLogin}>
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
      </div>
    </div>
  );
}
