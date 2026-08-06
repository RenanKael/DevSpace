const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

async function request(path, options = {}) {
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const payload = await response.json();
      errorMessage = payload?.message || errorMessage;
    } catch {
      // ignore parse errors
    }
    throw new Error(errorMessage || "Erro na requisição API");
  }

  return response.json();
}

export async function fetchPosts() {
  return request("/posts");
}

export async function createPost(postData) {
  return request("/posts", {
    method: "POST",
    body: JSON.stringify(postData),
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

export async function resetPasswordApi(emailOrHandle, novaSenha) {
  return request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ emailOrHandle, novaSenha }),
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

export async function buscarTarefas() {
  return request("/tarefas");
}
export async function criarTarefa(descricao) {
  return request("/tarefas", {
    method: "POST",
    body: JSON.stringify({ descricao }),
  });
}
export async function atualizarTarefa(id, descricao, status) {
  return request(`/tarefas/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ descricao, status }),
  });
}
export async function deletarTarefa(id) {
  return request(`/tarefas/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}