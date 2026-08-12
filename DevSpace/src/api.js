const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "devspaceToken";

const STATUS_MESSAGES = {
  400: "Dados inválidos. Confira e tente de novo.",
  401: "Entre na sua conta para continuar.",
  403: "Você não tem permissão para isso.",
  404: "Não encontramos o que você procura.",
  409: "Esse dado já está em uso.",
  429: "Muitas tentativas. Espere um pouco e tente de novo.",
  500: "O servidor falhou. Tente novamente em instantes.",
};

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setAuthToken(token, persist = true) {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    if (!token) return;
    const storage = persist ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token);
  } catch {
    // storage cheio ou bloqueado
  }
}

export function clearAuthToken() {
  setAuthToken("");
}

function messageFromStatus(status) {
  return STATUS_MESSAGES[status] || "Não foi possível concluir a operação.";
}

export function unwrapAuthPayload(data, persist = true) {
  if (data?.token) setAuthToken(data.token, persist);
  return data?.user || data;
}

async function request(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const token = getAuthToken();
  const headers = { ...(options.headers || {}) };
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"] && !headers["content-type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new Error("Sem conexão com o servidor. Verifique se o DevSpace está online.");
  }

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !String(path).includes("/auth/")) {
      clearAuthToken();
      window.dispatchEvent(new Event("devspace:unauthorized"));
    }
    const errorMessage =
      (payload && typeof payload === "object" && payload.message) || messageFromStatus(response.status);
    throw new Error(errorMessage);
  }

  return payload;
}

export async function fetchPosts() {
  return request("/posts");
}

export async function fetchMyCollection(tipo) {
  return request(`/me/collections/${encodeURIComponent(tipo)}`);
}

export async function createPost(postData) {
  return request("/posts", {
    method: "POST",
    body: JSON.stringify(postData),
  });
}

export async function uploadFile(file) {
  const form = new FormData();
  form.append("file", file);
  return request("/uploads", {
    method: "POST",
    body: form,
  });
}

export async function updatePost(postId, updateData) {
  return request(`/posts/${encodeURIComponent(postId)}`, {
    method: "PUT",
    body: JSON.stringify(updateData),
  });
}

export async function deletePost(postId) {
  return request(`/posts/${encodeURIComponent(postId)}`, {
    method: "DELETE",
  });
}

export async function likePost(postId, usuarioId) {
  return request(`/posts/${encodeURIComponent(postId)}/like`, {
    method: "POST",
    body: JSON.stringify({ usuarioId }),
  });
}

export async function sharePost(postId, usuarioId) {
  return request(`/posts/${encodeURIComponent(postId)}/share`, {
    method: "POST",
    body: JSON.stringify({ usuarioId }),
  });
}

export async function bookmarkPost(postId, usuarioId) {
  return request(`/posts/${encodeURIComponent(postId)}/bookmark`, {
    method: "POST",
    body: JSON.stringify({ usuarioId }),
  });
}

export async function votePoll(postId, usuarioId, optionIndex) {
  return request(`/posts/${encodeURIComponent(postId)}/poll/vote`, {
    method: "POST",
    body: JSON.stringify({ usuarioId, optionIndex }),
  });
}

export async function addComment(postId, usuarioId, texto, parentId, imagem) {
  return request(`/posts/${encodeURIComponent(postId)}/comments`, {
    method: "POST",
    body: JSON.stringify({ usuarioId, texto, parentId, imagem }),
  });
}

export async function deleteComment(commentId) {
  return request(`/comments/${encodeURIComponent(commentId)}`, {
    method: "DELETE",
  });
}

export async function likeComment(commentId, usuarioId) {
  return request(`/comments/${encodeURIComponent(commentId)}/like`, {
    method: "POST",
    body: JSON.stringify({ usuarioId }),
  });
}

export async function followUser(usuarioAlvoId, seguidorId) {
  return request(`/users/${encodeURIComponent(usuarioAlvoId)}/follow`, {
    method: "POST",
    body: JSON.stringify({ seguidorId }),
  });
}

export async function fetchFollowers(userId) {
  return request(`/users/${encodeURIComponent(userId)}/followers`);
}

export async function fetchFollowing(userId) {
  return request(`/users/${encodeURIComponent(userId)}/following`);
}

export async function updateNotifPrefs(prefs) {
  return request("/users/me/notification-prefs", {
    method: "PUT",
    body: JSON.stringify(prefs),
  });
}

export async function fetchConversas(usuarioId) {
  return request(`/conversas?usuarioId=${encodeURIComponent(usuarioId)}`);
}

export async function getOrCreateConversaApi(usuarioId, outroUsuarioId) {
  return request("/conversas", {
    method: "POST",
    body: JSON.stringify({ usuarioId, outroUsuarioId }),
  });
}

export async function enviarMensagemApi(conversaId, usuarioId, texto, imagem) {
  return request(`/conversas/${encodeURIComponent(conversaId)}/mensagens`, {
    method: "POST",
    body: JSON.stringify({ usuarioId, texto, imagem }),
  });
}

export async function fetchUnreadConversas(usuarioId) {
  return request(`/conversas/unread?usuarioId=${encodeURIComponent(usuarioId)}`);
}

export async function markConversaAsRead(conversaId, usuarioId) {
  return request(`/conversas/${encodeURIComponent(conversaId)}/marcar-lida`, {
    method: "POST",
    body: JSON.stringify({ usuarioId }),
  });
}

export async function rateUser(userId, nota) {
  return request(`/users/${encodeURIComponent(userId)}/ratings`, {
    method: "POST",
    body: JSON.stringify({ nota }),
  });
}

export async function sendContactRequest(destinatarioId, remetenteId) {
  return request(`/users/${encodeURIComponent(destinatarioId)}/contact-request`, {
    method: "POST",
    body: JSON.stringify({ remetenteId }),
  });
}

export async function fetchContactRequests(usuarioId) {
  return request(`/users/${encodeURIComponent(usuarioId)}/contact-requests`);
}

export async function acceptContactRequest(solicitacaoId, usuarioId) {
  return request(`/contact-requests/${encodeURIComponent(solicitacaoId)}/accept`, {
    method: "POST",
    body: JSON.stringify({ usuarioId }),
  });
}

export async function declineContactRequest(solicitacaoId, usuarioId) {
  return request(`/contact-requests/${encodeURIComponent(solicitacaoId)}/decline`, {
    method: "POST",
    body: JSON.stringify({ usuarioId }),
  });
}

export async function fetchNotifications(usuarioId) {
  return request(`/users/${encodeURIComponent(usuarioId)}/notifications`);
}

export async function markNotificationAsRead(notificacaoId) {
  return request(`/notifications/${encodeURIComponent(notificacaoId)}/read`, {
    method: "POST",
  });
}

export async function markMessageNotificationsAsRead(atorHandle) {
  return request(`/notifications/read-from/${encodeURIComponent(atorHandle)}`, {
    method: "POST",
  });
}

export async function markAllNotificationsAsRead(usuarioId) {
  return request("/notifications/read-all", {
    method: "POST",
    body: JSON.stringify({ usuarioId }),
  });
}

export async function blockUser(bloqueadoId, bloqueadorId) {
  return request(`/users/${encodeURIComponent(bloqueadoId)}/block`, {
    method: "POST",
    body: JSON.stringify({ bloqueadorId }),
  });
}

export async function unblockUser(bloqueadoId, bloqueadorId) {
  return request(`/users/${encodeURIComponent(bloqueadoId)}/unblock`, {
    method: "POST",
    body: JSON.stringify({ bloqueadorId }),
  });
}

export async function fetchBlockedUsers(usuarioId) {
  return request(`/users/${encodeURIComponent(usuarioId)}/blocked`);
}

export async function loginUser(emailOrHandle, senha) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ emailOrHandle, senha }),
  });
}

export async function checkAuthAvailability({ email, handle, telefone } = {}) {
  return request("/auth/check", {
    method: "POST",
    body: JSON.stringify({ email, handle, telefone }),
  });
}

export async function loginGoogle(accessToken) {
  return request("/auth/google", {
    method: "POST",
    body: JSON.stringify({ accessToken }),
  });
}

export async function requestPasswordReset(emailOrHandle) {
  return request("/auth/forgot", {
    method: "POST",
    body: JSON.stringify({ emailOrHandle }),
  });
}

export async function sendVerificationCode({ email, telefone } = {}) {
  return request("/auth/send-code", {
    method: "POST",
    body: JSON.stringify({ email, telefone }),
  });
}

export async function logoutApi() {
  try {
    await request("/auth/logout", { method: "POST" });
  } catch {
    // mesmo se o servidor falhar, o client limpa a sessão
  } finally {
    clearAuthToken();
  }
}

export async function resetPasswordApi(emailOrHandle, novaSenha, codigo) {
  return request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ emailOrHandle, novaSenha, codigo }),
  });
}

export async function registerUser(user) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify(user),
  });
}

export async function fetchUsers() {
  return request("/users");
}

export async function fetchUser(handle) {
  return request(`/users/${encodeURIComponent(handle)}`);
}

export async function updateUser(userId, updates) {
  return request(`/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}
