import { useState } from "react";
import Login from "./paginas/Login";
import Home from "./paginas/Home";
import Perfil from "./paginas/Perfil";

function App() {
  const [logado, setLogado] = useState(false);
  const [pagina, setPagina] = useState("home");

  if (!logado) {
    return <Login onLogin={() => setLogado(true)} />;
  }

  if (pagina === "perfil") {
    return (
      <Perfil
        onLogout={() => setLogado(false)}
        irHome={() => setPagina("home")}
      />
    );
  }

  return (
    <Home irPerfil={() => setPagina("perfil")} />
  );
}

export default App;