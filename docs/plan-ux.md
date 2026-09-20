# KipuBank — Plan UX / Confianza

Frontend-only improvements to make KipuBank feel like a product, not a console.
No smart contract changes. Scope: `kipubank-dapp` only.

## Goals

- Better UX for newbies and experienced users
- More transaction context (history, quotes, capacity)
- Step-by-step guided flows (ERC-20 deposit)
- Input validation (zod) and OWASP guard-rails on every surface

## Decisions (confirmed)

| Topic | Choice |
| --- | --- |
| Deposit ETH | Keep as card; use shared `QuotePreview` (no stepper) |
| On-chain history | Connected user only |
| USDC credited on deposits | Best-effort join with USDC `Transfer` in same tx |
| Security headers | Basic headers + CSP in report-only mode |
| Pause / non-EOA owner | Out of scope (contract repo) |

## Cross-cutting rules (every task)

- **Testing**: Pure logic in `src/lib/` with colocated `*.test.ts`; components with Testing Library + mocked wagmi/viem.
- **Validation**: All user inputs go through zod schemas in `src/lib/validation/`.
- **OWASP**: Strict input validation (A03), sanitize on-chain strings (A03), allow-listed external URLs (A10), expected contract/chain checks (A08), bounded RPC ranges (A10).

---

## Phase 0 — Foundations

### T0.1 — zod validation module · M

- **Files**: `src/lib/validation/schemas.ts`, `schemas.test.ts`
- **Add**: `zod` dependency
- **Content**: `ethereumAddressSchema`, `makeAmountSchema({ decimals, max? })`, helpers returning `{ ok, value?, error? }`
- **Tests**: valid/invalid addresses, amounts, decimals overflow, empty/zero/negative

### T0.2 — Sanitization + safe URLs · S

- **Files**: `src/lib/sanitize.ts`, `sanitize.test.ts`
- **Content**: `sanitizeTokenSymbol`, `sanitizeTokenName`, `etherscanTxUrl`, `etherscanAddressUrl`, `etherscanTokenUrl` (host allow-list: `sepolia.etherscan.io`)
- **Tests**: malicious symbols, invalid hashes/addresses

### T0.3 — HTTP security headers · S

- **Files**: `src/lib/security/headers.ts`, `headers.test.ts`; wire in `next.config.ts`
- **Content**: `X-Frame-Options`, `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy-Report-Only`
- **Tests**: builder returns expected directives including RPC from env

---

## Phase 1 — Bank capacity · S

### T1.1 — Remaining capacity

- **Files**: `src/lib/bank-stats.ts` (+ test), `src/components/bank-panel.tsx` (+ test)
- **Content**: `calculateRemainingCapacity`, "cuánto más entra" UI, warning color when >90% used

---

## Phase 2 — Unified quote / preview · M

### T2.1 — Quote logic · M

- **Files**: `src/lib/quote.ts`, `quote.test.ts`
- **Content**: `buildHumanPath`, `describeQuote` view-model (path, slippage, min out, cap warnings)

### T2.2 — Hook · S

- **Files**: `src/hooks/use-swap-quote.ts`

### T2.3 — QuotePreview component · S

- **Files**: `src/components/quote-preview.tsx`, `quote-preview.test.tsx`
- **Replace**: inline quote blocks in `deposit-eth.tsx`; reuse in stepper

---

## Phase 3 — ERC-20 deposit stepper · L

### T3.1 — Stepper state machine · M

- **Files**: `src/lib/deposit-stepper.ts`, `deposit-stepper.test.ts`
- **Steps**: token → amount → approve → confirm → success

### T3.2 — Stepper UI primitive · S

- **Files**: `src/components/ui/stepper.tsx`, `stepper.test.tsx`; extend `Modal` with `size`

### T3.3 — DepositTokenWizard · L

- **Files**: `src/components/deposit-token-wizard.tsx`, `deposit-token-wizard.test.tsx`
- **Replaces**: card `deposit-token.tsx` with modal stepper + guided copy + tx previews

### T3.4 — Console integration · S

- **Files**: `src/components/kipubank-console.tsx`

---

## Phase 4 — Pre-connect wallet UX · M

### T4.1 — Wallet detection + error classification · M

- **Files**: extend `src/lib/metamask.ts`, `src/lib/wallet-ui.ts` (+ tests)
- **Content**: `resolveWalletAvailability`, `classifyConnectError`, EIP-6963 on mount

### T4.2 — ConnectWallet UI · S

- **Files**: `src/components/connect-wallet.tsx` (+ test)
- **Paths**: not installed / installed but locked / pending request (-32002)

---

## Phase 5 — On-chain transaction history · L

### T5.1 — Events in ABI · S

- **Files**: `src/lib/abis/kipubank.ts`
- **Events**: `SuccessfulEtherDeposit`, `SuccessfulTokenDeposit`, `SuccessfulTokenWithdrawal`, etc.

### T5.2 — History logic · M

- **Files**: `src/lib/tx-history.ts`, `tx-history.test.ts`
- **Content**: normalize logs, filter deposits by sender (client-side), chunk block ranges, join USDC credited, sort/format

### T5.3 — useTxHistory hook · M

- **Files**: `src/hooks/use-tx-history.ts`
- **Env**: `NEXT_PUBLIC_KIPUBANK_DEPLOY_BLOCK` (fallback: last N blocks)

### T5.4 — TransactionHistory component · M

- **Files**: `src/components/transaction-history.tsx`, `transaction-history.test.tsx`

### T5.5 — Env + README · S

- **Files**: `.env.example`, `src/lib/constants.ts`, `README.md`

---

## Execution order

1. Phase 0 (T0.1 → T0.3)
2. Phase 1 (T1.1)
3. Phase 2 (T2.1 → T2.3)
4. Phase 3 (T3.1 → T3.4)
5. Phase 4 (T4.1 → T4.2) — can parallelize after Phase 0
6. Phase 5 (T5.1 → T5.5)

## Definition of done (per task)

- Tests green for new/changed code
- `npm run lint` clean
- `npm run build` clean
- No secrets committed
