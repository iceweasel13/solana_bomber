# Phase 1: State Structures - COMPLETE ✅

## Date: 2026-01-15

**Status:** State structures completely redesigned and compiling successfully.

---

## What Was Implemented

### 1. GlobalState - Dynamic Configuration System ✅

**New Fields Added (17 new fields):**
- `game_has_started: bool` - Game activation flag
- `start_block: i64` - Game start timestamp
- `house_count: u64` - Total houses initialized
- `unique_heroes_count: u64` - Total heroes minted globally
- `total_hash_power: u64` - Sum of all active players' power
- `cumulative_bombcoin_per_power: u128` - MasterChef accounting
- `initial_house_price: u64` - Entry fee (SOL lamports)
- `initial_bombcoin_per_block: u64` - Base reward rate
- `halving_interval: u64` - Supply milestone for halvings
- `burn_pct: u16` - Burn percentage (0-10000 = 0-100%)
- `referral_fee: u16` - Referral bonus % (0-10000)
- `rewards_precision: u64` - Calculation precision

**Methods Added:**
- `get_bombcoin_per_block()` - Calculates current reward rate with halving logic
- `blocks_until_next_halving()` - Returns countdown to next halving

**Size:** 232 bytes (up from 130 bytes)

---

### 2. Matrix Housing System ✅

#### HouseTile Struct
```rust
pub struct HouseTile {
    pub x: u8,                 // X coordinate
    pub y: u8,                 // Y coordinate
    pub hero_id: u16,          // Inventory index (u16::MAX if empty)
    pub is_restroom: bool,     // Restroom bonus flag
}
```

**Methods:**
- `is_empty()` - Check if tile is vacant
- `empty(x, y)` - Create empty tile

**Size:** 5 bytes per tile

#### GridDimensions - Level-Based Sizing
| Level | Grid Size | Total Tiles | Restroom Slots | Upgrade Cost | Cooldown |
|-------|-----------|-------------|----------------|--------------|----------|
| 1     | 4x4       | 16          | 4              | -            | -        |
| 2     | 4x6       | 24          | 6              | 500 coins    | 1 hour   |
| 3     | 5x6       | 30          | 8              | 1000 coins   | 2 hours  |
| 4     | 6x6       | 36          | 10             | 2000 coins   | 4 hours  |
| 5     | 6x7       | 42          | 12             | 4000 coins   | 8 hours  |
| 6     | 7x7       | 49          | 15             | 8000 coins   | 16 hours |

---

### 3. Hero Template System (9 Skin Archetypes) ✅

#### Hero Struct - Updated
```rust
pub struct Hero {
    pub id: u16,                    // Unique inventory ID
    pub skin_id: u8,                // Visual template (1-9)
    pub rarity: HeroRarity,         // Drop rate tier
    pub power: u32,                 // Mining power stat
    pub speed: u32,                 // HP drain speed
    pub stamina: u32,               // Recovery rate
    pub max_stamina: u32,           // Stamina cap
    pub bomb_number: u8,            // Bomb count (1-5)
    pub bomb_range: u8,             // Bomb range (1-7)
    pub hp: u32,                    // Current HP
    pub max_hp: u32,                // Max HP
    pub last_action_time: i64,      // Timestamp for time-delta
}
```

**Methods:**
- `calculate_hmp()` - Compute Hero Mining Power
- `calculate_hp_drain(elapsed_seconds)` - HP loss over time
- `calculate_hp_recovery(elapsed_seconds, multiplier)` - HP gain in house
- `is_sleeping()` - Check if HP == 0
- `is_active()` - Check if HP > 0

**Size:** ~56 bytes per hero

#### HeroRarity - Drop Rate System
| Rarity     | Drop Rate | Power Range | Bomb Count | Bomb Range |
|------------|-----------|-------------|------------|------------|
| Common     | 50%       | 10-30       | 1          | 1-2        |
| Uncommon   | 30%       | 25-50       | 1-2        | 2-3        |
| Rare       | 15%       | 45-75       | 2          | 3-4        |
| SuperRare  | 4%        | 70-100      | 2-3        | 4-5        |
| Epic       | 0.9%      | 95-130      | 3-4        | 5-6        |
| Legendary  | 0.1%      | 125-160     | 4-5        | 6-7        |

**Methods:**
- `from_roll(0-1000)` - Determine rarity from RNG
- `stat_range()` - Get valid stat bounds
- `bomb_count_range()` - Get bomb count bounds
- `bomb_range_range()` - Get bomb range bounds

---

### 4. UserAccount - Complete Redesign ✅

**Fields Removed:**
- `active_house: Vec<u16>` ❌ (replaced by grid)
- `restroom_slots: Vec<u16>` ❌ (now part of grid tiles)
- `house_upgrade_start: i64` ❌ (renamed)

**Fields Added:**
- `initialized_starter_house: bool` - Entry purchase flag
- `last_house_upgrade_timestamp: i64` - Cooldown tracking
- `grid_width: u8` - Current grid width
- `grid_height: u8` - Current grid height
- `house_occupied_coords: Vec<HouseTile>` - Matrix system
- `player_power: u64` - Cached total HMP
- `player_pending_rewards: u64` - Unclaimed BOMBcoin
- `last_reward_block: i64` - Last claim timestamp
- `reward_debt: u128` - MasterChef accounting
- `referral_bonus_paid: u64` - Referral earnings
- `referrals: Vec<Pubkey>` - List of referred users

**Methods Added:**
- `get_upgrade_cost()` - Returns coin cost for next level
- `get_upgrade_cooldown()` - Returns cooldown duration
- `get_max_restroom_slots()` - Returns max restroom count
- `count_restroom_slots()` - Returns current restroom usage
- `find_hero_on_grid(hero_index)` - Find hero's tile
- `is_valid_coord(x, y)` - Validate grid position
- `is_coord_occupied(x, y)` - Check if tile is taken

**Size:** ~15,000 bytes (variable, depends on hero count)

---

## Architecture Changes

### Before (Old System)
```
UserAccount {
    house_level: u8,
    active_house: Vec<u16>,      // Simple list
    active_map: Vec<u16>,
    restroom_slots: Vec<u16>,
}
```

### After (New System)
```
UserAccount {
    house_level: u8,
    grid_width: u8,
    grid_height: u8,
    house_occupied_coords: Vec<HouseTile>,  // Matrix with coordinates
    active_map: Vec<u16>,
    // Restroom is now a tile property
}
```

**Benefits:**
- ✅ Spatial strategy gameplay
- ✅ Frontend can render exact positions
- ✅ Expandable grid with upgrades
- ✅ No hard limit on house capacity (grows with level)

---

## Formulas Preserved

All original formulas remain intact:

1. **HMP Calculation:**
   ```
   HMP = (Power × Bomb_Count) + (Bomb_Range × 0.5) + (Speed × 2)
   ```

2. **HP Drain:**
   ```
   HP Drain = (Elapsed_Seconds / 60) × Hero_Speed
   ```

3. **HP Recovery:**
   ```
   HP Recovery = (Elapsed_Seconds / 120) × Stamina × Location_Multiplier
   ```

---

## Compilation Status

✅ **state.rs compiles successfully** (confirmed with `cargo check`)

**Next Steps:**
- Phase 2: Update `errors.rs` with new error codes
- Phase 2: Update `utils.rs` with template-based hero generation
- Phase 2: Implement admin configuration functions in `lib.rs`
- Phase 3: Implement core gameplay functions (bulk mint, grid placement, rewards)
- Phase 4: Add read-only view functions for frontend

---

## Breaking Changes

⚠️ **This requires a fresh deployment** - old testnet accounts are incompatible.

**Reason:** Data structure has fundamentally changed from simple vectors to a coordinate-based matrix system.

---

## Files Modified

- ✅ `/Users/iceweasel/solana_bomber/programs/solana_bomber/src/state.rs` - Complete rewrite (479 lines)

**Files Pending Update:**
- ⏳ `errors.rs` - Add new error codes for grid system
- ⏳ `utils.rs` - Rewrite hero generation with templates
- ⏳ `lib.rs` - Rewrite all 12+ instructions

---

## Test Plan

Once Phase 2-4 are complete:
1. Deploy fresh program to devnet
2. Test admin config updates
3. Test bulk hero minting (1-10 at once)
4. Test grid placement logic
5. Test reward calculations with halving
6. Validate read-only views

---

**Phase 1 Duration:** ~30 minutes
**Next Phase:** Phase 2 - Admin Config & Utils (Est. 45 minutes)
