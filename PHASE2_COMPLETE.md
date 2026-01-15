# Phase 2: Errors & Utils - COMPLETE ✅

## Date: 2026-01-15

**Status:** Error codes and utility functions updated for new architecture.

---

## What Was Implemented

### 1. Error Codes - Comprehensive Coverage ✅

**File:** `/Users/iceweasel/solana_bomber/programs/solana_bomber/src/errors.rs`

**Total Error Codes:** 30 (up from 19)

#### New Errors Added:

**Game State Errors:**
- `GameNotStarted` - Game hasn't been activated yet
- `Unauthorized` - Admin-only function called by non-admin

**Economic Errors:**
- `InsufficientSOL` - Not enough SOL for transaction
- `InvalidBurnPercentage` - Burn% must be 0-10000
- `InvalidReferralFee` - Referral% must be 0-10000

**Hero Errors:**
- `HeroNotInInventory` - Hero doesn't exist
- `InvalidHeroQuantity` - Bulk mint must be 1-10

**Grid/House Errors:**
- `HouseNotInitialized` - Must purchase house first
- `InvalidGridCoordinates` - x/y out of bounds
- `GridPositionOccupied` - Tile already has a hero
- `GridPositionEmpty` - No hero at this tile
- `HeroNotOnGrid` - Hero not placed on grid

**Restroom Errors:**
- `HeroNotInRestroom` - Hero is on bench, not restroom

**Referral Errors:**
- `InvalidReferrer` - Referrer account is invalid

**Account Errors:**
- `AlreadyInitialized` - Account exists
- `InvalidOwner` - Wrong owner

---

### 2. Utils - Template-Based Hero Generation ✅

**File:** `/Users/iceweasel/solana_bomber/programs/solana_bomber/src/utils.rs`

#### New Functions:

**1. generate_hero() - Template System**
```rust
pub fn generate_hero(
    id: u16,
    timestamp: i64,
    slot: u64,
    user_pubkey: Pubkey,
    global_hero_count: u64, // NEW: Additional entropy
) -> Result<Hero>
```

**Changes:**
- ✅ Rolls for **skin_id (1-9)** - Fixed visual archetypes
- ✅ Rolls for **rarity (0-1000)** - Better precision than old 0-9999
- ✅ Stats constrained by **rarity ranges** (not fully random)
- ✅ HP calculated with **rarity multiplier** (2x-5x base stats)

**2. calculate_burn_split() - Dynamic Economy**
```rust
pub fn calculate_burn_split(total: u64, burn_pct: u16) -> (u64, u64)
```
- Returns `(burn_amount, treasury_amount)`
- `burn_pct` is 0-10000 (where 10000 = 100%)

**3. calculate_referral_bonus() - Referral System**
```rust
pub fn calculate_referral_bonus(amount: u64, referral_pct: u16) -> u64
```
- Returns bonus amount for referrer
- `referral_pct` is 0-10000

**4. calculate_mining_reward() - Time-Based Rewards**
```rust
pub fn calculate_mining_reward(
    elapsed_seconds: u64,
    player_power: u64,
    bombcoin_per_block: u64,
    rewards_precision: u64,
) -> u64
```
- Converts seconds → hours
- Formula: `Hours × Power × Rate`
- Supports precision multiplier

---

## Hero Generation Example

### Old System (Random Stats):
```rust
// All heroes unique, no visual archetypes
power: random(10-160)
speed: random(10-160)
skin: none
```

### New System (Template-Based):
```rust
// Rarity: Common (50% drop rate)
skin_id: 3           // Visual archetype #3
power: 15            // Constrained to 10-30
speed: 22            // Constrained to 10-30
stamina: 18          // Constrained to 10-30
bomb_number: 1       // Constrained to 1
bomb_range: 2        // Constrained to 1-2
hp: 110              // (15+22+18) * 2 = 110

// Rarity: Legendary (0.1% drop rate)
skin_id: 7           // Visual archetype #7
power: 145           // Constrained to 125-160
speed: 152           // Constrained to 125-160
stamina: 138         // Constrained to 125-160
bomb_number: 5       // Constrained to 4-5
bomb_range: 7        // Constrained to 6-7
hp: 2175             // (145+152+138) * 5 = 2175
```

---

## Tests Added

### Rarity Distribution Test
```rust
#[test]
fn test_rarity_distribution() {
    assert_eq!(HeroRarity::from_roll(0), HeroRarity::Common);
    assert_eq!(HeroRarity::from_roll(499), HeroRarity::Common);
    assert_eq!(HeroRarity::from_roll(500), HeroRarity::Uncommon);
    // ... validates all 6 rarity tiers
}
```

### Burn Split Test
```rust
#[test]
fn test_burn_split() {
    // 50% burn
    assert_eq!(calculate_burn_split(1000, 5000), (500, 500));
    // 30% burn
    assert_eq!(calculate_burn_split(1000, 3000), (300, 700));
}
```

### Mining Reward Test
```rust
#[test]
fn test_mining_reward() {
    // 1 hour, 100 power, 10 rate = 1000 reward
    let reward = calculate_mining_reward(3600, 100, 10, 1);
    assert_eq!(reward, 1000);
}
```

---

## Skin Archetypes (9 Templates)

The `skin_id` field (1-9) will correspond to these visual archetypes:

| skin_id | Archetype Name       | Description                  |
|---------|----------------------|------------------------------|
| 1       | Classic Bomber       | Traditional bomber style     |
| 2       | Fire Warrior         | Flame-themed hero            |
| 3       | Ice Mage             | Ice/frost bomber             |
| 4       | Shadow Ninja         | Stealth/dark theme           |
| 5       | Golden Knight        | Royal/premium aesthetic      |
| 6       | Cyber Punk           | Futuristic tech theme        |
| 7       | Forest Ranger        | Nature/wood theme            |
| 8       | Ocean Pirate         | Water/sea theme              |
| 9       | Lightning Striker    | Electric/thunder theme       |

**Note:** Skin ID is purely cosmetic. Stats are determined by rarity, not skin.

---

## Compilation Status

⚠️ **Expected Errors:** `lib.rs` still references old field names:
- `total_heroes_minted` → now `unique_heroes_count`
- `house_upgrade_start` → now `last_house_upgrade_timestamp`
- `active_house` → now uses `house_occupied_coords` (grid system)
- `restroom_slots` → now part of `HouseTile.is_restroom`

**These will be fixed in Phase 3** when we rewrite all instructions.

---

## Files Modified

- ✅ `/Users/iceweasel/solana_bomber/programs/solana_bomber/src/errors.rs` - Complete rewrite (109 lines)
- ✅ `/Users/iceweasel/solana_bomber/programs/solana_bomber/src/utils.rs` - Complete rewrite (307 lines)

**Files Pending (Phase 3):**
- ⏳ `lib.rs` - Rewrite all 12+ instructions
- ⏳ Update instruction context structs
- ⏳ Implement admin config functions
- ⏳ Implement bulk hero minting
- ⏳ Implement grid placement logic
- ⏳ Implement time-based reward claiming

---

## Next Steps: Phase 3 Scope

Phase 3 will implement these **12+ instructions**:

### Admin Functions (5):
1. `initialize_global_state` - Setup game with config
2. `update_game_config` - Update dynamic parameters
3. `set_treasury` - Change treasury wallet
4. `toggle_pause` - Pause/unpause game
5. `start_game` - Activate the game

### User Functions (7):
1. `purchase_initial_house` - Buy entry (0.25 SOL)
2. `buy_hero(quantity)` - Bulk mint 1-10 heroes
3. `place_hero_on_grid(x, y, is_restroom)` - Grid placement
4. `remove_hero_from_grid(x, y)` - Remove from grid
5. `move_hero_to_map(hero_id)` - Start mining
6. `claim_rewards` - Collect BOMBcoin
7. `recover_hp` - HP recovery for grid heroes
8. `upgrade_house` - Expand grid
9. `set_referrer` - One-time referral link

---

**Phase 2 Duration:** ~20 minutes
**Next Phase:** Phase 3 - Core Instructions (Est. 90+ minutes)

**Ready to proceed with Phase 3?**
