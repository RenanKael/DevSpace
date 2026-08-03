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

export async function loginUser(emailOrHandle, senha) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ emailOrHandle, senha }),
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