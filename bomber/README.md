# Solana Bomber Admin Panel

A modern admin panel built with Next.js, TypeScript, Tailwind CSS, Shadcn UI, and Framer Motion for managing the Solana Bomber Play-to-Earn game.

## Features

### 📊 Stats Panel
- Real-time game statistics
- Total houses, heroes, coins mined
- Economic parameters display
- Burn/reward pool tracking
- Game status indicators

### 🛡️ Admin Panel
- **Start Game** - Initialize the game
- **Toggle Pause** - Emergency pause/unpause
- **Toggle Minting** - Enable/disable hero minting
- **Toggle House Upgrades** - Enable/disable house upgrades
- **Update Config** - Modify economic parameters
- **Withdraw Funds** - Transfer SPL tokens to treasury

### 👤 User Panel
- **Purchase House** - Buy initial house (0.25 SOL)
- **Set Referrer** - Link referrer for bonuses
- **Buy Heroes** - Mint 1-10 heroes at once
- **Claim Rewards** - Collect mining rewards
- **Recover HP** - Restore hero HP
- **Upgrade House** - Expand grid capacity
- **Bulk Place Heroes** - Place multiple heroes on grid (NEW)
- **Bulk Move to Map** - Move multiple heroes to map (NEW)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn UI + Radix UI
- **Animations**: Framer Motion
- **Blockchain**: Solana Web3.js + Anchor
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Solana CLI configured with devnet
- Deployed Solana Bomber program on devnet

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the admin panel.

## Project Structure

```
bomber/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main dashboard with tabs
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Global styles
│   ├── components/
│   │   ├── admin/
│   │   │   └── AdminPanel.tsx     # Admin controls
│   │   ├── stats/
│   │   │   └── StatsPanel.tsx     # Game statistics
│   │   ├── user/
│   │   │   └── UserPanel.tsx      # User functions
│   │   └── ui/                    # Shadcn UI components
│   ├── lib/
│   │   ├── solana-config.ts      # Solana configuration
│   │   └── utils.ts               # Utility functions
│   └── types/
│       └── game.ts                # TypeScript interfaces
└── package.json
```

## Configuration

### Solana Program

Update the program ID in `/src/lib/solana-config.ts`:

```typescript
export const PROGRAM_ID = new PublicKey("YOUR_PROGRAM_ID_HERE");
```

### Network

Default network is `devnet`. To change:

```typescript
export const NETWORK = "devnet" | "testnet" | "mainnet-beta";
```

## New Production Features

This admin panel includes UI for the newly implemented production features:

1. **Bulk Hero Placement** - Place multiple heroes on grid in single transaction
2. **Bulk Hero Movement** - Move multiple heroes to map in single transaction
3. **Granular Toggles** - Separate controls for minting and house upgrades
4. **Token Withdrawal** - Admin function to withdraw SPL tokens

## Integration with Smart Contract

To fully integrate with the deployed program:

1. Copy the IDL from `/target/idl/solana_bomber.json`
2. Add Anchor program initialization
3. Implement wallet connection (Phantom, Solflare, etc.)
4. Wire up each action button to call the corresponding program instruction

## Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Other Platforms

Build and deploy the `.next` folder to any Node.js hosting platform.

## Next Steps

- [ ] Add wallet connection (Phantom/Solflare)
- [ ] Implement Anchor program calls
- [ ] Add real-time data fetching with polling
- [ ] Add transaction confirmation toasts
- [ ] Implement hero grid visualization
- [ ] Add player stats charts
- [ ] Add transaction history
- [ ] Add error handling and validation

## License

MIT

## Support

Program ID (Devnet): `97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7`

Explorer: https://explorer.solana.com/address/97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7?cluster=devnet
