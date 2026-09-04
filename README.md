# KipuBank Console

Frontend for **[KipuBankV3](https://github.com/DiegoNG90/KipuBankV3)** on Ethereum Sepolia.

Connect MetaMask, deposit ETH or ERC-20 tokens, and withdraw USDC. There is no backend: the browser talks to the chain through wagmi/viem.

The smart contract, Foundry tests, deploy script, and security notes live in the contract repo:

**https://github.com/DiegoNG90/KipuBankV3**

Read that README for `BANKCAP`, slippage, Uniswap V2 paths, and constructor checks. This repo only covers running the UI.

## How it works

KipuBankV3 is a vault: everything becomes USDC.

1. `depositEther()` — native ETH is swapped to USDC via Uniswap V2 (`WETH → USDC`).
2. `depositToken()` — USDC is credited as-is; other ERC-20s are swapped (`Token → WETH → USDC`).
3. `withdrawToken()` — withdrawals are USDC only, with a per-transaction cap.

Internal balances are always `balances[user][USDC]`.

## Live Sepolia deployment

| | |
| --- | --- |
| KipuBankV3 | [`0xd8473b57CAdEd25D7b41b4c451e74C1Bf92DD3ca`](https://sepolia.etherscan.io/address/0xd8473b57CAdEd25D7b41b4c451e74C1Bf92DD3ca) |
| Circle USDC | [`0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`](https://sepolia.etherscan.io/token/0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238) |
| Uniswap V2 Router | `0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3` |
| WETH | `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14` |

Do **not** use `0x078dEbfbFC8C2764c561Bd636D833Cc569FDb3B2`. That instance was deployed with a wrong USDC address and every deposit reverts.

## Prerequisites

- Node.js 20+
- npm
- [MetaMask](https://metamask.io/) in **Chrome, Brave, or Firefox** (the Cursor/VS Code preview has no extensions)
- Sepolia ETH for gas ([Alchemy faucet](https://www.alchemy.com/faucets/ethereum-sepolia) or [Google Cloud faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia))
- Optional Sepolia USDC from [Circle’s faucet](https://faucet.circle.com/) (network: Ethereum Sepolia)

## Run locally

```bash
git clone https://github.com/DiegoNG90/Kipubank-dapp.git
cd Kipubank-dapp
npm install
cp .env.example .env.local
```

On Windows PowerShell use `copy .env.example .env.local`.

`.env.example` already points at the live contract. `.env.local` is gitignored — never commit it. You can swap the RPC for Alchemy/Infura if PublicNode is slow:

```env
NEXT_PUBLIC_KIPUBANK_ADDRESS=0xd8473b57CAdEd25D7b41b4c451e74C1Bf92DD3ca
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
```

Avoid `https://rpc.sepolia.org` from the browser; it often fails with `Failed to fetch`. The app also falls back to PublicNode if your env RPC dies.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), connect MetaMask, switch to Sepolia if asked, then deposit or withdraw.

```bash
npm run lint
npm run build
```

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| `Provider not found` | Open the app in a browser with MetaMask installed and unlocked |
| `Failed to fetch` / `eth_call` HTTP error | Change `NEXT_PUBLIC_SEPOLIA_RPC_URL` and restart `npm run dev` |
| Wrong network banner | Use the in-app switch to Sepolia (chain id `11155111`) |
| Deposit reverts | Confirm `NEXT_PUBLIC_KIPUBANK_ADDRESS` is the live address above, not the broken one |
| History empty or fails to load | Set `NEXT_PUBLIC_KIPUBANK_DEPLOY_BLOCK` to the contract creation block on Etherscan, or use a faster RPC |

## Transaction history

When your wallet is connected, the console reads KipuBankV3 events from Sepolia:

- `SuccessfulEtherDeposit` / `SuccessfulTokenDeposit` (filtered to your address client-side)
- `SuccessfulTokenWithdrawal` (filtered on-chain by indexed `_sender`)
- USDC `Transfer` logs to the bank contract (best-effort join for “USDC credited”)

Logs are fetched in block chunks to stay within public RPC limits. By default the UI scans the latest `100000` blocks unless `NEXT_PUBLIC_KIPUBANK_DEPLOY_BLOCK` is set in `.env.local`.

```env
NEXT_PUBLIC_KIPUBANK_DEPLOY_BLOCK=1234567
```

Find the creation block on [Etherscan](https://sepolia.etherscan.io/address/0xd8473b57CAdEd25D7b41b4c451e74C1Bf92DD3ca) under **Contract Creator** → creation transaction → block number.

## Stack

- Next.js (App Router) + TypeScript
- wagmi v2 + viem + TanStack Query
- Tailwind CSS 4
- MetaMask (injected connector) · Sepolia

## Project structure

```
src/
├── app/                 # App Router (layout, page, globals)
├── components/          # Wallet, bank panel, deposit, withdraw
├── config/wagmi.ts      # Injected connector + RPC fallbacks
├── hooks/               # Bank stats and debounce
└── lib/
    ├── abis/            # KipuBank, ERC-20, Uniswap V2 router
    ├── constants.ts     # Sepolia addresses (contract from env)
    └── errors.ts        # Custom revert decoder
```

## License

MIT
