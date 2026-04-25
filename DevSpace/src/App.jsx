import { useState } from "react";
import Login from "./paginas/Login";
import Home from "./paginas/Home";

function App() {
  const [logado, setLogado] = useState(false);

  return logado ? (
    <Home />
  ) : (
    <Login onLogin={() => setLogado(true)} />
  );
}

export default App;