# 💰 Test Coins Minting Guide

## What Was Added

I've added an **admin-only function** to mint test coins directly to any user account. This is perfect for testing the hero purchase functionality without having to wait for rewards to accumulate.

---

## New Smart Contract Function

**Function:** `admin_mint_test_coins`

**Location:** `/Users/iceweasel/solana_bomber/programs/solana_bomber/src/lib.rs` (line 207-219)

```rust
/// Admin: Mint test coins to a user (for testing only)
pub fn admin_mint_test_coins(
    ctx: Context<AdminMintTestCoins>,
    amount: u64,
) -> Result<()> {
    let user_account = &mut ctx.accounts.user_account;

    user_account.coin_balance = user_account.coin_balance.checked_add(amount)
        .ok_or(GameError::ArithmeticOverflow)?;

    msg!("Admin minted {} test coins to user: {}", amount, ctx.accounts.target_user.key());
    Ok(())
}
```

**Security:**
- ✅ Only callable by the admin authority wallet
- ✅ Checks authority via `has_one = authority` constraint
- ✅ Uses safe arithmetic with overflow protection

---

## Deployment Status

✅ **Program rebuilt and upgraded** on devnet
✅ **Transaction**: `4gkjeC...JqS9d`
✅ **Program ID**: `5ADLMwFhWfUHd1rxbRa3DZ8mVCZMDoJryfMi1dAxRNpc` (unchanged)
✅ **Frontend IDL updated**

---

## How to Mint Test Coins

### Method 1: Using the CLI Script (Easiest)

I've created a script that makes it super easy to mint coins:

```bash
node mint-test-coins.js <wallet_address> <amount>
```

**Example - Mint 1,000,000 coins to yourself:**
```bash
node mint-test-coins.js GLJ8JosWyqebA2D4hZ9X7kYVX1sxmy7qQ7aJ6NHDjU2w 1000000
```

**Example amounts:**
- `1000` = 1,000 coins
- `10000` = 10,000 coins
- `100000` = 100,000 coins
- `1000000` = 1,000,000 coins

**Output:**
```
💰 Minting Test Coins

📍 Target User: GLJ8JosWyqebA2D4hZ9X7kYVX1sxmy7qQ7aJ6NHDjU2w
📍 User Account PDA: 8xY...abc
💵 Amount: 1,000,000 coins
🔑 Admin Authority: GLJ8JosWyqebA2D4hZ9X7kYVX1sxmy7qQ7aJ6NHDjU2w

📤 Sending mint transaction...
✅ Test coins minted successfully!
📝 Transaction signature: 5Gh...xyz
💰 User now has 1,000,000 additional coins!

🔗 View on Solscan:
   https://solscan.io/tx/5Gh...xyz?cluster=devnet
```

### Method 2: From Frontend (TODO - Add UI)

The function is already in `program-service.ts` and ready to use:

```typescript
await programService.adminMintTestCoins(
  new PublicKey("target_wallet_address"),
  1000000 // amount
);
```

You could add a button in the Admin panel to call this function.

---

## Important Notes

### ⚠️ Prerequisites

**The user MUST have purchased a house first!**

The user account (PDA) only exists after they call `purchase_initial_house`. You cannot mint coins to a non-existent account.

**Error if user hasn't purchased house:**
```
❌ User account does not exist!
💡 The user must purchase a house first before receiving coins.
```

### 💡 Testing Workflow

1. **Unpause the game** (if paused):
   ```bash
   # From Admin panel in UI, click "Resume Game"
   ```

2. **Purchase a house** (creates your user account):
   - Make sure you have 0.25 SOL
   - Click "Purchase House" in the game
   - This creates your UserAccount PDA

3. **Mint test coins to yourself**:
   ```bash
   node mint-test-coins.js <your_wallet> 1000000
   ```

4. **Test buying heroes**:
   - Now you have coins to test the hero purchase feature!
   - Buy heroes from the game UI
   - Test placing them on the grid
   - Test claiming rewards

---

## Hero Costs

According to your game economy, heroes cost coins to purchase. Here are typical costs:

**Hero Purchase Cost:**
- Check `buy_hero` function in the code for exact pricing
- Likely around 1,000-10,000 coins per hero

**Recommended Test Amount:**
- Mint **1,000,000 coins** to have plenty for testing
- This should allow you to buy 100-1000 heroes depending on pricing

---

## Files Modified

1. ✅ `/Users/iceweasel/solana_bomber/programs/solana_bomber/src/lib.rs`
   - Added `admin_mint_test_coins` function (line 207-219)
   - Added `AdminMintTestCoins` context (line 1405-1425)

2. ✅ `/Users/iceweasel/solana_bomber/bomber/src/lib/program-service.ts`
   - Added `adminMintTestCoins` method (line 195-214)

3. ✅ `/Users/iceweasel/solana_bomber/bomber/src/lib/idl.json`
   - Updated with new function

4. ✅ `/Users/iceweasel/solana_bomber/mint-test-coins.js`
   - New CLI script for easy minting

---

## Quick Start Commands

```bash
# 1. Check your wallet address
solana address

# 2. Make sure game is running and unpaused
node diagnose-start-game-error.js

# 3. Purchase a house (from game UI)
# This creates your user account

# 4. Mint test coins
node mint-test-coins.js $(solana address) 1000000

# 5. Test buying heroes in the game!
```

---

## Example Full Testing Flow

```bash
# Terminal 1: Check game state
$ node diagnose-start-game-error.js
Game Has Started: true
Paused: false  ← Should be false (unpaused)

# Terminal 2: Purchase house (from browser UI)
# Open http://localhost:3000
# Click "Purchase House"
# Approve transaction (costs 0.25 SOL)

# Terminal 3: Mint test coins
$ node mint-test-coins.js GLJ8JosWyqebA2D4hZ9X7kYVX1sxmy7qQ7aJ6NHDjU2w 1000000
✅ Test coins minted successfully!
💰 User now has 1,000,000 additional coins!

# Terminal 4 / Browser: Test buying heroes
# Open game UI
# Click "Buy Hero"
# Should work with your new coin balance! 🎉
```

---

## Summary

✅ **New Function**: `admin_mint_test_coins` - Admin can mint test coins to any user
✅ **CLI Script**: `mint-test-coins.js` - Easy command-line minting
✅ **Frontend Ready**: `adminMintTestCoins()` in program-service.ts
✅ **Security**: Only admin authority can mint coins

**Next Steps:**
1. Purchase a house (if you haven't already)
2. Run: `node mint-test-coins.js <your_wallet> 1000000`
3. Test buying heroes with your new coins! 🎮

**Optional:** Add a "Mint Test Coins" button to the Admin panel UI for easier testing.
