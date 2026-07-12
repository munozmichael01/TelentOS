/**
 * Cliente de la API interna para componentes (auditoría H6).
 * Regla: toda mutación desde el cliente pasa por apiFetch — nunca `fetch`
 * fire-and-forget. Un fallo del servidor debe llegar al usuario, no perderse.
 *
 * Uso:
 *   try {
 *     const { run } = await apiFetch<{ run: PayRun }>("/api/payroll/runs", { method: "POST", json: body });
 *   } catch (e) {
 *     setError(e instanceof ApiError ? e.message : "Error inesperado");
 *   }
 */

import { emitToast } from "@/lib/toast-bus";

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  /** Cuerpo JSON: se serializa y añade Content-Type automáticamente. */
  json?: unknown;
  body?: BodyInit;
};

/**
 * Aviso de error al usuario para acciones fire-and-forget (aprobar, borrar…).
 * Punto único: emite un toast al <Toaster/> del AppShell (degrada a alert si no
 * hay ninguno montado, ver lib/toast-bus.ts).
 */
export function notifyError(action: string, e: unknown): void {
  const detail = e instanceof ApiError ? e.message : "Error inesperado";
  emitToast({ variant: "error", title: action, message: detail });
}

/** Aviso de éxito (mismo canal que notifyError). */
export function notifySuccess(message: string, title?: string): void {
  emitToast({ variant: "success", title, message });
}

export async function apiFetch<T = unknown>(url: string, options: ApiFetchOptions = {}): Promise<T> {
  const { json, headers, body, ...rest } = options;

  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...headers } : headers,
    body: json !== undefined ? JSON.stringify(json) : body,
  });

  // Las rutas de la app responden JSON con { error: string } en fallos (lib/api.ts jsonError)
  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      data !== null && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Error ${res.status}`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}
