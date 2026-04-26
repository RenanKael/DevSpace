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

    // 🔥 NOVOS CAMPOS
    criadoEm: new Date().toISOString(),
    bio: "",
    fotoPerfil: "",
    fotoCapa: "",
    estrelas: 1,
    projetos: []
  };

  usuarios.push(novoUsuario);
  localStorage.setItem("usuarios", JSON.stringify(usuarios));

  setSucesso("Conta criada com sucesso! Faça login 😊");
  setErro("");

  setUsername("");
  setEmail("");
  setSenha("");

  setTimeout(() => {
    setModoCadastro(false);
    setSucesso("");
  }, 2500);
}