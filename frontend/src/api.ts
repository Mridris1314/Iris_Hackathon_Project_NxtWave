const API = import.meta.env.VITE_API_URL || "http://localhost:8080";

export function getToken(): string | null {
  return localStorage.getItem("iris_token");
}
export function setToken(t: string) {
  localStorage.setItem("iris_token", t);
}
export function clearToken() {
  localStorage.removeItem("iris_token");
}

async function req(path: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Request failed");
  return data;
}

export type Scan = {
  id: number;
  mode: string;
  language: string;
  result: string;
  thumbnail: string | null;
  created_at: string;
};

export type Stats = {
  total_scans: number;
  scene_scans: number;
  text_scans: number;
  object_scans: number;
};

export const api = {
  register: (email: string, password: string) =>
    req("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) =>
    req("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => req("/me") as Promise<{ email: string; language: string }>,
  setLang: (language: string) =>
    req("/me", { method: "PATCH", body: JSON.stringify({ language }) }),
  describe: (image_base64: string, mode: string, lang: string, thumbnail_base64?: string) =>
    req("/describe", {
      method: "POST",
      body: JSON.stringify({ image_base64, mode, lang, thumbnail_base64 }),
    }) as Promise<{ text: string }>,
  history: () => req("/history") as Promise<Scan[]>,
  deleteScan: (id: number) => req(`/history/${id}`, { method: "DELETE" }),
  stats: () => req("/stats") as Promise<Stats>,
  changePassword: (current_password: string, new_password: string) =>
    req("/me/password", {
      method: "PATCH",
      body: JSON.stringify({ current_password, new_password }),
    }),
};
