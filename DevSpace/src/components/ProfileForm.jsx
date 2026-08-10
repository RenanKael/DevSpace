export default function ProfileForm({
  form,
  setForm,
  onSubmit,
  erro = "",
  sucesso = "",
  salvando = false,
  showPassword = false,
  passwordOnly = false,
  senhaAtual = "",
  setSenhaAtual,
  novaSenha = "",
  setNovaSenha,
  confirmarSenha = "",
  setConfirmarSenha,
  mostrarSenhas = false,
  setMostrarSenhas,
  onPickPhoto,
  onPickCover,
  submitLabel = "Salvar alterações",
  onCancel,
  cancelLabel = "Cancelar",
}) {
  return (
    <form className="ds-profile-form" onSubmit={onSubmit}>
      {(onPickPhoto || onPickCover) && (
        <div className="ds-profile-media">
          {onPickPhoto && (
            <button type="button" className="ds-btn ds-btn-secondary" onClick={onPickPhoto}>
              Alterar foto
            </button>
          )}
          {onPickCover && (
            <button type="button" className="ds-btn ds-btn-secondary" onClick={onPickCover}>
              Alterar capa
            </button>
          )}
        </div>
      )}

      {!passwordOnly && (
        <>
          <label className="config-field">
            <span>Nome</span>
            <input
              value={form.username || ""}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoComplete="name"
            />
          </label>

          <label className="config-field">
            <span>Usuário</span>
            <input
              value={form.handle || ""}
              onChange={(e) => setForm({ ...form, handle: e.target.value.replace(/\s+/g, "") })}
              autoComplete="username"
            />
          </label>

          <label className="config-field">
            <span>Bio</span>
            <textarea
              rows={4}
              value={form.bio || ""}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </label>

          <label className="notif-toggle">
            <input
              type="checkbox"
              checked={!!form.disponivelContratacao}
              onChange={(e) => setForm({ ...form, disponivelContratacao: e.target.checked })}
            />
            <span className="notif-toggle-track" aria-hidden="true" />
            <span className="notif-toggle-label">Disponível para contratação</span>
          </label>
        </>
      )}

      {showPassword && (
        <>
          {!passwordOnly && <h4 className="config-subsection">Segurança</h4>}
          {!passwordOnly && (
            <p className="notif-config-hint">Mínimo de 6 caracteres. Informe a senha atual para confirmar.</p>
          )}
          <label className="config-field">
            <span>Senha atual</span>
            <input
              type={mostrarSenhas ? "text" : "password"}
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              placeholder={passwordOnly ? "" : "Deixe em branco para não alterar"}
              autoComplete="current-password"
            />
          </label>
          <label className="config-field">
            <span>Nova senha</span>
            <input
              type={mostrarSenhas ? "text" : "password"}
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="config-field">
            <span>Confirmar nova senha</span>
            <input
              type={mostrarSenhas ? "text" : "password"}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <button type="button" className="config-password-toggle" onClick={() => setMostrarSenhas?.((v) => !v)}>
            {mostrarSenhas ? "Ocultar senhas" : "Mostrar senhas"}
          </button>
        </>
      )}

      {erro && <p className="erro">{erro}</p>}
      {sucesso && <p className="sucesso">{sucesso}</p>}

      <div className="popup-btns ds-form-actions">
        <button type="submit" className="ds-btn ds-btn-primary" disabled={salvando}>
          {salvando ? "Salvando..." : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="ds-btn ds-btn-secondary" onClick={onCancel} disabled={salvando}>
            {cancelLabel}
          </button>
        )}
      </div>
    </form>
  );
}
