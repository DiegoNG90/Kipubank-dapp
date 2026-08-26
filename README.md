# KipuBank Console

A Next.js dApp for interacting with **KipuBankV3** on Sepolia. Deposit ETH or ERC-20 tokens (swapped to USDC via Uniswap V2), view vault stats, and withdraw USDC — all client-side with MetaMask.

## Stack

- Next.js 16 (App Router) + TypeScript
- wagmi v2 + viem + TanStack Query
- Tailwind CSS 4
- MetaMask only · Sepolia (chain ID `11155111`)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   Copy `.env.example` to `.env.local` and set your deployed contract address:

   ```bash
   cp .env.example .env.local
   ```

   ```env
   NEXT_PUBLIC_KIPUBANK_ADDRESS=0xYourDeployedKipuBankV3Address
   NEXT_PUBLIC_SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
   ```

   > **Important:** Do not use the broken old deploy at `0x078dEbfbFC8C2764c561Bd636D833Cc569FDb3B2`. Deploy a fresh KipuBankV3 from the contract repo.

3. **Run locally**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Sepolia test assets

| Asset | Faucet |
|-------|--------|
| Sepolia ETH | [Alchemy Sepolia Faucet](https://www.alchemy.com/faucets/ethereum-sepolia), [Google Cloud Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia) |
| Sepolia USDC | [Circle Faucet](https://faucet.circle.com/) — select **Ethereum Sepolia** |

## Contract constants (Sepolia)

| Parameter | Address |
|-----------|---------|
| Uniswap V2 Router | `0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3` |
| WETH | `0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14` |
| USDC | `0x1c7D4B196Cb0C7B01D743Fbc6116a902379C7238` (6 decimals) |

## Features

- **Wallet** — MetaMask connect/disconnect with Sepolia network guard and one-click switch
- **Bank panel** — TVL, BANKCAP capacity bar, deposit/withdraw counters, slippage & max withdrawal limits, user USDC balance
- **Deposit ETH** — debounced Uniswap quote, min-out preview using on-chain `SLIPPAGE_TOLERANCE_BPS`, `simulateContract` before write
- **Deposit ERC-20** — allowance check + approve flow; USDC direct deposit or swap path for other tokens
- **Withdraw USDC** — client-side balance & per-tx cap validation, simulation, Etherscan tx links
- **Errors** — custom KipuBank revert reasons decoded to human-readable messages

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm run lint     # ESLint
npm run start    # serve production build
```

## Project structure

```
src/
├── app/                 # Next.js App Router (layout, page, globals)
├── components/
│   ├── ui/              # Hand-written shadcn-style primitives
│   ├── bank-panel.tsx
│   ├── connect-wallet.tsx
│   ├── deposit-eth.tsx
│   ├── deposit-token.tsx
│   ├── kipubank-console.tsx
│   ├── network-guard.tsx
│   ├── providers.tsx
│   ├── tx-status.tsx
│   └── withdraw-usdc.tsx
├── config/wagmi.ts      # wagmi + MetaMask injected connector
├── hooks/               # bank stats, debounce helpers
└── lib/
    ├── abis/            # typed const ABIs
    ├── constants.ts
    ├── errors.ts        # custom error decoder
    └── utils.ts
```

## License

MIT
