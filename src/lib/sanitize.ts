import { isAddress } from "viem";

const ETHERSCAN_HOST = "sepolia.etherscan.io";
const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

const DEFAULT_SYMBOL = "TOKEN";
const MAX_SYMBOL_LENGTH = 12;
const MAX_NAME_LENGTH = 32;

function stripControlChars(value: string): string {
  return value.replace(/[\x00-\x1F\x7F]/g, "").trim();
}

export function sanitizeTokenSymbol(raw: string | undefined | null): string {
  if (!raw) return DEFAULT_SYMBOL;
  const cleaned = stripControlChars(raw);
  if (!cleaned) return DEFAULT_SYMBOL;
  return cleaned.slice(0, MAX_SYMBOL_LENGTH);
}

export function sanitizeTokenName(raw: string | undefined | null): string {
  if (!raw) return DEFAULT_SYMBOL;
  const cleaned = stripControlChars(raw);
  if (!cleaned) return DEFAULT_SYMBOL;
  return cleaned.slice(0, MAX_NAME_LENGTH);
}

function buildEtherscanUrl(path: string): string | undefined {
  return `https://${ETHERSCAN_HOST}${path}`;
}

export function etherscanTxUrl(hash: string): string | undefined {
  if (!TX_HASH_REGEX.test(hash)) return undefined;
  return buildEtherscanUrl(`/tx/${hash}`);
}

export function etherscanAddressUrl(address: string): string | undefined {
  if (!isAddress(address) || !ADDRESS_REGEX.test(address)) return undefined;
  return buildEtherscanUrl(`/address/${address}`);
}

export function etherscanTokenUrl(address: string): string | undefined {
  if (!isAddress(address) || !ADDRESS_REGEX.test(address)) return undefined;
  return buildEtherscanUrl(`/token/${address}`);
}
