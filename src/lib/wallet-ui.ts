export type ConnectErrorKind =
  | "userRejected"
  | "pending"
  | "providerNotFound"
  | "locked"
  | "generic";

export type ClassifiedConnectError = {
  kind: ConnectErrorKind;
  message: string;
};

function extractErrorDetails(error: unknown): { message: string; code?: number } {
  if (!error || typeof error !== "object") {
    return { message: "Transaction failed with an unknown error." };
  }

  const record = error as Record<string, unknown>;
  const cause = record.cause as Record<string, unknown> | undefined;

  const message =
    (typeof record.message === "string" && record.message) ||
    (typeof record.shortMessage === "string" && record.shortMessage) ||
    (error instanceof Error ? error.message : "") ||
    "Transaction failed with an unknown error.";

  const code =
    typeof record.code === "number"
      ? record.code
      : typeof cause?.code === "number"
        ? cause.code
        : undefined;

  return { message, code };
}

export function classifyConnectError(error: unknown): ClassifiedConnectError {
  const { message, code } = extractErrorDetails(error);
  const lower = message.toLowerCase();

  if (
    code === 4001 ||
    lower.includes("user rejected") ||
    lower.includes("user denied")
  ) {
    return {
      kind: "userRejected",
      message:
        "Rechazaste la conexión en MetaMask. Podés volver a intentarlo cuando quieras.",
    };
  }

  if (
    code === -32002 ||
    lower.includes("already pending") ||
    lower.includes("request already pending")
  ) {
    return {
      kind: "pending",
      message:
        "Ya hay una solicitud abierta en MetaMask. Abrí la extensión y respondé la ventana pendiente.",
    };
  }

  if (lower.includes("provider not found")) {
    return {
      kind: "locked",
      message:
        "MetaMask está instalada pero no responde. Abrí la extensión, desbloqueala y volvé a tocar Connect wallet.",
    };
  }

  return { kind: "generic", message };
}

export function providerHint(message: string | undefined) {
  if (!message) return undefined;
  return classifyConnectError({ message }).message;
}

export function shouldOpenWalletGuide(error: unknown): boolean {
  return classifyConnectError(error).kind === "locked";
}
