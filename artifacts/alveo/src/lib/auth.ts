const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const TOKEN_KEY  = "alveo_auth_token";
const EMAIL_KEY  = "alveo_user_email";

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function getStoredEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

function storeToken(token: string, email: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EMAIL_KEY, email);
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EMAIL_KEY);
}

let inflight: Promise<string> | null = null;

export async function getAuthToken(email: string): Promise<string> {
  const storedEmail = getStoredEmail();
  const storedToken = getStoredToken();

  if (storedToken && storedEmail === email) {
    return storedToken;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch(`${BASE}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
      const data = (await res.json()) as { token: string; email: string };
      storeToken(data.token, data.email);
      return data.token;
    } catch (err) {
      clearToken();
      throw err;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function clearAuth(): void {
  clearToken();
}

export async function makeAuthHeaders(email: string): Promise<Record<string, string>> {
  const token = await getAuthToken(email);
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };
}

export function makeAuthHeadersSync(): Record<string, string> {
  const token = getStoredToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}
