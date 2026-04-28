// ...imports iguais

export default function Perfil({ onLogout, irHome }) {
  const [usuario, setUsuario] = useState(null);
  const [editando, setEditando] = useState(false);

  const [editandoPerfilImg, setEditandoPerfilImg] = useState(false);
  const [editandoCapaImg, setEditandoCapaImg] = useState(false);

  const [form, setForm] = useState({});
  const [senhaAtual, setSenhaAtual] = useState("");

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [posPerfil, setPosPerfil] = useState({ x: 50, y: 50 });
  const [posCapa, setPosCapa] = useState({ x: 50, y: 50 });

  const [avaliacao, setAvaliacao] = useState(0);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("usuarioLogado"));

    if (user) {
      if (!user.criadoEm) {
        user.criadoEm = new Date().toISOString();
      }

      setUsuario(user);
      setForm(user);
      setAvaliacao(user.avaliacao || 0);

      setPosPerfil(user.posPerfil || { x: 50, y: 50 });
      setPosCapa(user.posCapa || { x: 50, y: 50 });
    }
  }, []);

  function salvar() {
    let usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];

    // 🔒 EMAIL DUPLICADO
    const emailJaExiste = usuarios.find(
      (u) => u.email === form.email && u.email !== usuario.email
    );

    if (emailJaExiste) {
      setErro("Este email já está em uso!");
      return;
    }

    // 🔒 VALIDAÇÃO DE SENHA
    if (form.novaSenha || form.confirmarSenha) {

      if (!senhaAtual) {
        setErro("Digite a senha atual!");
        return;
      }

      if (senhaAtual !== usuario.senha) {
        setErro("Senha atual incorreta!");
        return;
      }

      if (form.novaSenha !== form.confirmarSenha) {
        setErro("As senhas não coincidem!");
        return;
      }
    }

    const atualizado = {
      ...form,
      senha: form.novaSenha ? form.novaSenha : usuario.senha,
      posPerfil,
      posCapa,
      avaliacao,
    };

    delete atualizado.novaSenha;
    delete atualizado.confirmarSenha;

    usuarios = usuarios.map((u) =>
      u.email === usuario.email ? atualizado : u
    );

    localStorage.setItem("usuarios", JSON.stringify(usuarios));
    localStorage.setItem("usuarioLogado", JSON.stringify(atualizado));

    setUsuario(atualizado);
    setSucesso("Salvo com sucesso!");
    setErro("");
    setSenhaAtual("");

    setTimeout(() => setSucesso(""), 2000);
  }
}