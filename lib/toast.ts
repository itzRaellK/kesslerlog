import { toast as sonnerToast } from "sonner";

/** Mensagem de sucesso (verde no Sonner com richColors). */
export function toastSuccess(message: string, description?: string) {
  sonnerToast.success(message, description ? { description } : undefined);
}

/** Mensagem de erro. */
export function toastError(message: string, description?: string) {
  sonnerToast.error(message, description ? { description } : undefined);
}

/** Aviso (amarelo). */
export function toastWarning(message: string, description?: string) {
  sonnerToast.warning(message, description ? { description } : undefined);
}

/** Informação neutra. */
export function toastInfo(message: string, description?: string) {
  sonnerToast.info(message, description ? { description } : undefined);
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Ocorreu um erro inesperado.";
}
