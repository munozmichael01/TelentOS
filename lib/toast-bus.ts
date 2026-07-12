/**
 * Bus de toasts — pub/sub sobre un CustomEvent de `window`, para que `notifyError`
 * (y cualquier código no-React) dispare un toast que el <Toaster/> montado en el
 * AppShell renderiza. Se apoya en window (no en un singleton de módulo) para ser
 * robusto ante recargas de HMR. Se separa de React a propósito: lo importa
 * `lib/api-client.ts`.
 */

export type ToastVariant = "error" | "success" | "info";

export type ToastInput = {
  variant: ToastVariant;
  title?: string;
  message: string;
  /** ms hasta auto-cierre; por defecto 4500 */
  duration?: number;
};

export type Toast = { id: number; variant: ToastVariant; title?: string; message: string; duration: number };

const EVENT = "app:toast";
let seq = 0;
let subscriberCount = 0;

export function subscribeToasts(listener: (t: Toast) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => listener((e as CustomEvent<Toast>).detail);
  window.addEventListener(EVENT, handler);
  subscriberCount++;
  return () => {
    window.removeEventListener(EVENT, handler);
    subscriberCount--;
  };
}

export function emitToast(input: ToastInput): void {
  if (typeof window === "undefined") return;
  const toast: Toast = {
    id: ++seq,
    variant: input.variant,
    title: input.title,
    message: input.message,
    duration: input.duration ?? 4500,
  };
  // Si no hay ningún <Toaster/> montado (p. ej. fuera del AppShell), degradamos a
  // alert para no perder el aviso.
  if (subscriberCount === 0) {
    window.alert(toast.title ? `${toast.title}: ${toast.message}` : toast.message);
    return;
  }
  window.dispatchEvent(new CustomEvent<Toast>(EVENT, { detail: toast }));
}
