# 🚀 How to Initialize Solana Bomber Game

## ✅ Easy Method: Use the Admin Panel (RECOMMENDED)

### Step 1: Prepare Your Wallet
1. Make sure you have the **authority wallet** imported in Phantom
   - Authority address: `GLJ8JosWyqebA2D4hZ9X7kYVX1sxmy7qQ7aJ6NHDjU2w`
   - This is the wallet from `~/.config/solana/id.json`

2. Ensure Phantom is on **Devnet**
   - Open Phantom → Settings (⚙️) → Developer Settings
   - Network: **Devnet**

3. Get devnet SOL
   ```bash
   solana airdrop 2 --url devnet
   ```
   Or use: https://faucet.solana.com/

### Step 2: Run the Admin Panel
```bash
cd /Users/iceweasel/solana_bomber/bomber
npm run dev
```

Open: http://localhost:3000

### Step 3: Initialize the Game

1. **Click "Connect Phantom"** (top right)
2. Approve the connection in Phantom popup
3. Go to **"Admin"** tab
4. You should see 5 admin action cards

5. **Click "Initialize Game"** (purple card with 🚀 icon)
   - A confirmation dialog will appear showing:
     - House Price: 0.25 SOL
     - Reward Rate: 1000 coins/hour
     - Burn Rate: 50%
     - Referral Fee: 2.5%
     - Treasury: Your wallet

6. **Click OK** to confirm
7. Phantom will popup asking you to approve the transaction
8. **Approve the transaction**

9. Wait for confirmation (5-10 seconds)
10. You should see: ✅ "Game initialized successfully!"

### Step 4: Start the Game

1. After initialization, click **"Start Game"** (green card)
2. Approve the transaction in Phantom
3. You should see: ✅ "Game started successfully!"

### Step 5: Verify

1. Go to **"Stats"** tab
2. You should see:
   - Game Started: ✓ (green)
   - All statistics showing real data
   - Economic parameters displayed

## ✅ Done!

The game is now ready for users! They can:
- Purchase houses (0.25 SOL)
- Buy heroes
- Claim rewards
- Upgrade houses
- Use all game features

---

## Troubleshooting

### "Transaction simulation failed"
- **Cause**: Trying to initialize twice, or not using authority wallet
- **Fix**: Only the authority wallet can initialize, and it's a one-time operation

### "Unauthorized"
- **Cause**: Wrong wallet connected
- **Fix**: Make sure you're using the authority wallet (`GLJ8...`)

### "Insufficient funds"
- **Cause**: Not enough SOL for gas fees
- **Fix**: Get more devnet SOL: `solana airdrop 2 --url devnet`

### Button doesn't respond
- **Check**: Browser console (F12) for errors
- **Check**: Phantom is unlocked and on Devnet
- **Try**: Disconnect and reconnect wallet

### "Account already initialized"
- **Status**: ✅ Game is already initialized!
- **Next**: Just click "Start Game" if not already started

---

## What the Initialization Does

The `initializeGlobalState` function:
1. Creates the global state PDA account
2. Creates the reward token mint (BOMBcoin)
3. Sets economic parameters:
   - Initial house price (0.25 SOL)
   - Reward rate (1000 coins/hour)
   - Halving interval (1 billion coins)
   - Burn percentage (50%)
   - Referral fee (2.5%)
4. Sets the treasury address (your wallet)
5. Initializes counters (houses, heroes, hash power)

Then `startGame`:
1. Sets `game_has_started = true`
2. Records the start timestamp
3. Opens the game for users

---

## Verify on Solana Explorer

After initialization, check the accounts:

**Program:**
https://explorer.solana.com/address/97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7?cluster=devnet

**Global State PDA:**
- Derive from seeds: `["global_state"]`
- Check in explorer after initialization

---

## Quick Reference

**Program ID**: `97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7`
**Authority**: `GLJ8JosWyqebA2D4hZ9X7kYVX1sxmy7qQ7aJ6NHDjU2w`
**Network**: Solana Devnet
**Admin Panel**: http://localhost:3000

---

Now go to the admin panel and click that purple **"Initialize Game"** button! 🚀
