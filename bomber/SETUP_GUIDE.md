# Setup Guide - Getting Started

## Step 1: Verify Phantom Wallet Setup

1. **Install Phantom Extension**
   - Go to https://phantom.app/
   - Install the browser extension
   - Create or import your wallet

2. **Switch to Devnet**
   - Open Phantom
   - Click the gear icon (Settings)
   - Click "Developer Settings"
   - Change network to **Devnet**
   - Close and reopen Phantom

3. **Get Devnet SOL**
   - Copy your wallet address from Phantom
   - Go to https://faucet.solana.com/
   - Paste your address
   - Request 2 SOL (you might need to do this 2-3 times)

## Step 2: Check if Game is Initialized

The error you're seeing means the global state account doesn't exist yet. The game needs to be initialized by the admin wallet first.

### Check Current Status

Run these commands in terminal:

```bash
cd /Users/iceweasel/solana_bomber

# Check if global state exists
solana account 97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7 --url devnet

# Check your wallet balance
solana balance --url devnet
```

## Step 3: Initialize the Game (ADMIN ONLY)

**IMPORTANT:** Only the authority wallet can initialize the game.

The authority wallet address is: `GLJ8JosWyqebA2D4hZ9X7kYVX1sxmy7qQ7aJ6NHDjU2w`

### If you ARE the admin:

1. Make sure this wallet is imported into Phantom
2. Switch to this wallet in Phantom
3. Connect to the admin panel
4. Go to the **Admin** tab
5. Click **"Initialize Global State"** (we need to add this button)

### If you are NOT the admin:

You need to wait for the admin to:
1. Initialize the game state
2. Click "Start Game"

Then you can use the User functions.

## Step 4: Initialize the Game via Command Line (Alternative)

If you have access to the authority wallet keypair, you can initialize via CLI:

```bash
cd /Users/iceweasel/solana_bomber

# Run the test to initialize
anchor test --skip-local-validator
```

Or create a script to initialize.

## Common Errors and Solutions

### Error: "Transaction simulation failed"
**Cause:** Global state not initialized yet
**Solution:** Initialize the game first (admin only)

### Error: "Account not found"
**Cause:** Game hasn't been started
**Solution:** Admin needs to call `start_game()`

### Error: "Insufficient funds"
**Cause:** Not enough SOL in wallet
**Solution:** Get more devnet SOL from faucet

### Error: "Unauthorized"
**Cause:** Trying to call admin function with non-admin wallet
**Solution:** Switch to authority wallet in Phantom

## Initialization Checklist

- [ ] Phantom installed and set to Devnet
- [ ] Wallet has at least 1 SOL on devnet
- [ ] Authority wallet imported (if you're admin)
- [ ] Game initialized (admin only, one-time)
- [ ] Game started (admin only, one-time)
- [ ] Your wallet connected to admin panel

## What Happens After Initialization

Once the admin initializes and starts the game:

1. **Users can:**
   - Purchase initial house (0.25 SOL)
   - Buy heroes (costs coins)
   - Claim rewards
   - Upgrade house
   - All other user functions

2. **Stats Panel shows:**
   - Game started: ✓
   - Total houses, heroes
   - Economic parameters

## Quick Start for Testing (Admin)

```bash
# 1. Initialize with test parameters
anchor run initialize-game

# 2. Start the game
anchor run start-game

# 3. Open admin panel
cd bomber
npm run dev
```

Now users can connect and play!
