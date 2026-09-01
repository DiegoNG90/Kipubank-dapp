export function providerHint(message: string | undefined) {
  if (message?.toLowerCase().includes("provider not found")) {
    return "No se encontró un provider. Recargá la página con MetaMask desbloqueada.";
  }
  return message;
}
