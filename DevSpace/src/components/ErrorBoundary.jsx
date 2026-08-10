import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("DevSpace UI:", error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="error-boundary">
        <span>Ops</span>
        <h1>Algo deu errado</h1>
        <p>Recarregue a página. Se o problema continuar, entre de novo na sua conta.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Recarregar
        </button>
      </div>
    );
  }
}
