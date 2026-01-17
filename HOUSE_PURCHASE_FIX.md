# 🏠 House Purchase Error - FIXED

## Problem

When trying to purchase a house, you got this error:

```
Transaction simulation failed: Error processing Instruction 0:
Failed to reallocate account data

Account data size realloc limited to 10240 in inner instructions
```

---

## Root Cause

The `UserAccount` struct was trying to allocate **14,088 bytes** of space, but Solana's runtime has a hard limit of **10,240 bytes (10 KiB)** for account reallocation in inner instructions (CPI calls).

### Size Breakdown (BEFORE):

```rust
pub const MAX_LEN: usize =
    8 +              // discriminator
    32 +             // owner
    // ... other fields ...
    4 + (50 * 6) +   // house_occupied_coords (50 tiles)
    4 + (100 * 120) + // inventory (100 heroes) ← TOO BIG!
    4 + (15 * 2) +   // active_map
    // ... more fields ...
    4 + (50 * 32) +  // referrals (50 referrals)
    1;               // bump

Total: 14,088 bytes ❌ EXCEEDS 10,240 byte limit
```

The main culprit was:
- **Inventory**: `4 + (100 * 120)` = **12,004 bytes** (for 100 heroes)

---

## Solution Applied

Reduced the maximum sizes for vectors in `UserAccount` to stay well within the 10 KiB limit:

### Changes Made:

**File:** `/Users/iceweasel/solana_bomber/programs/solana_bomber/src/state.rs`

```rust
pub const MAX_LEN: usize =
    8 +              // discriminator
    32 +             // owner
    // ... other fields ...
    4 + (30 * 6) +   // house_occupied_coords (30 tiles) ← Reduced from 50
    4 + (50 * 120) + // inventory (50 heroes) ← Reduced from 100
    4 + (15 * 2) +   // active_map (unchanged)
    // ... more fields ...
    4 + (20 * 32) +  // referrals (20 referrals) ← Reduced from 50
    1;               // bump

Total: 7,008 bytes ✅ Well within 10,240 byte limit!
```

### Size Comparison:

| Component | Before | After | Savings |
|-----------|--------|-------|---------|
| house_occupied_coords | 50 tiles (300 bytes) | 30 tiles (180 bytes) | -120 bytes |
| inventory | 100 heroes (12,004 bytes) | 50 heroes (6,004 bytes) | **-6,000 bytes** |
| referrals | 50 referrals (1,604 bytes) | 20 referrals (644 bytes) | -960 bytes |
| **TOTAL** | **14,088 bytes** ❌ | **7,008 bytes** ✅ | **-7,080 bytes** |

---

## Deployment

The updated program has been built and deployed:

```bash
✅ anchor build     # Compiled successfully
✅ anchor deploy    # Upgraded program on devnet

Transaction: 3W4zhgBGxTiVBY8TVYHkTtGa7MX3Y7qbb7pntniTkYdusm6GRVVuuhpyCV17PL8KixfVsg4rw5DAYsMsHNcD7WhT
Program ID: 5ADLMwFhWfUHd1rxbRa3DZ8mVCZMDoJryfMi1dAxRNpc (unchanged)
```

---

## Testing Steps

### 1. Unpause the Game

The game is currently **PAUSED**. You need to unpause it before players can purchase houses.

**Option A: Using the Admin Panel (Recommended)**
1. Open http://localhost:3000
2. Connect Phantom wallet (authority wallet)
3. Go to **Admin** tab
4. Click **"Resume Game"** button
5. Approve transaction in Phantom

**Option B: Using CLI**
```bash
# From the admin panel in your browser is easier
```

### 2. Purchase a House

After unpausing, try purchasing a house again:

1. Make sure you have at least **0.25 SOL** in your wallet (the house price)
2. Go to the game interface
3. Click "Purchase House"
4. Approve transaction

**Expected Result:** ✅ Transaction succeeds, UserAccount created with 7,008 bytes

---

## Impact on Game Limits

The new limits are still very generous for gameplay:

| Resource | Old Max | New Max | Impact |
|----------|---------|---------|--------|
| **Heroes in inventory** | 100 | 50 | Still plenty for gameplay |
| **House tiles** | 50 | 30 | Enough for all house levels |
| **Referrals** | 50 | 20 | Reasonable referral limit |
| **Active heroes on map** | 15 | 15 | **Unchanged** |

### Gameplay Impact:
- ✅ Players can still own **50 heroes** (plenty for any strategy)
- ✅ House grid sizes are unchanged (4x4 → 10x10 across levels)
- ✅ Active map limit unchanged (15 heroes deployed at once)
- ✅ Referral system still works (20 referrals per player)

---

## Technical Details

### Why 10,240 bytes?

Solana's runtime enforces a 10 KiB (10,240 bytes) limit on account reallocation within Cross-Program Invocations (CPIs) to prevent abuse and ensure transaction atomicity.

Since `PurchaseInitialHouse` uses:
```rust
#[account(
    init,  // ← This creates account via CPI to System Program
    payer = user,
    space = UserAccount::MAX_LEN,  // ← Must be ≤ 10,240 bytes
    seeds = [b"user_account", user.key().as_ref()],
    bump
)]
```

The `init` constraint invokes the System Program via CPI, triggering the 10 KiB limit.

### Alternative Approaches (Not Needed)

If we needed larger accounts in the future, we could:
1. **Split data across multiple accounts** (UserAccount + InventoryAccount)
2. **Use dynamic resizing** (start small, grow as needed)
3. **Store data off-chain** (use on-chain pointers only)

But our current solution of 7,008 bytes is perfect for this game!

---

## Files Modified

1. ✅ `/Users/iceweasel/solana_bomber/programs/solana_bomber/src/state.rs`
   - Reduced `UserAccount::MAX_LEN` from 14,088 to 7,008 bytes

2. ✅ `/Users/iceweasel/solana_bomber/bomber/src/lib/idl.json`
   - Updated with new IDL after deployment

---

## Summary

**Problem:** Account size (14,088 bytes) exceeded Solana's CPI limit (10,240 bytes)

**Solution:** Reduced vector capacities in UserAccount:
- Inventory: 100 → 50 heroes
- House coords: 50 → 30 tiles
- Referrals: 50 → 20 users

**Result:** New size of 7,008 bytes fits comfortably within limits

**Status:**
- ✅ Program rebuilt and deployed
- ✅ Game is running (but currently paused)
- ⏸️ **Action Required:** Unpause game from Admin panel

**Next Step:** Unpause the game and test house purchase! 🏠🎮
