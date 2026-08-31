export function setEthereum(value: unknown) {
  Object.defineProperty(window, "ethereum", {
    value,
    writable: true,
    configurable: true,
  });
}

export function clearEthereum() {
  delete (window as Window & { ethereum?: unknown }).ethereum;
}
