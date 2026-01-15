# Solana Bomber - Play-to-Earn Strategy Game

A blockchain-based strategy game built on Solana using the Anchor framework.

## 🎮 Game Overview

Solana Bomber is a Play-to-Earn game where players collect heroes, send them to mine on a map, and earn rewards based on their heroes' stats. The game features:

- **Hero System**: Mint random heroes with different rarities (Common to Legendary)
- **Mining Mechanics**: Send up to 15 heroes to mine simultaneously
- **HP & Stamina**: Heroes drain HP while mining and recover in the house
- **House Upgrades**: Unlock better recovery rates by upgrading your house
- **Supply-Based Halving**: Rewards decrease as total supply increases (100M cap)
- **Referral System**: Earn 2.5% bonus on referred players' claims

## 📋 Technical Architecture

### Core Design Decisions

1. **No NFTs for Heroes**: Heroes are stored as structs in a PDA for gas optimization
2. **Monolithic Account**: Single `UserAccount` PDA per player containing all hero data
3. **PDA Mint Authority**: Game contract holds mint authority via PDA, no private keys
4. **Time-Delta Rewards**: Lazy calculation based on time elapsed since last action

### Data Structure Hierarchy

```
UserAccount (PDA)
├─ inventory: Vec<Hero>          // Unlimited capacity
├─ active_house: Vec<u16>        // Max 21 heroes
│   ├─ restroom_slots: Vec<u16>  // 4-15 slots (house level dependent)
│   └─ bench: (remaining heroes) // Passive recovery
└─ active_map: Vec<u16>          // Max 15 heroes (mining)
```

## 🎲 Game Formulas

### Hero Mining Power (HMP)
```
HMP = (Power × Bomb_Number) + (Bomb_Range × 0.5) + (Speed × 2)
```

### Reward Calculation
```
Earned_Coins = Elapsed_Hours × Total_HMP × Phase_Rate

Phase Rates (per HMP per hour):
- Phase 1 (0-25M):    10.0 coins/hour
- Phase 2 (25M-50M):  5.0 coins/hour
- Phase 3 (50M-75M):  2.5 coins/hour
- Phase 4 (75M-100M): 1.25 coins/hour
```

### HP Drain (Speed-Based)
```
HP_Drained = (Elapsed_Seconds / 60) × Hero_Speed

Speed 1 = 1 HP per minute
Speed 5 = 5 HP per minute
```

### HP Recovery (120s Ticks)
```
Recovered_HP = (Elapsed_Seconds / 120) × Hero_Stamina × Location_Multiplier

Location Multipliers:
- Bench:        1.0x
- Restroom Lv1: 1.0x
- Restroom Lv2: 2.0x
- Restroom Lv3: 5.0x
- Restroom Lv4: 8.0x
- Restroom Lv5: 11.0x
- Restroom Lv6: 14.0x
```

## 🏠 House Upgrade System

| Level | Restroom Slots | Cost          | Cooldown | Recovery Speed |
|-------|----------------|---------------|----------|----------------|
| 1     | 4              | 0.25 SOL      | 0        | 1.0x           |
| 2     | 6              | 720 Coins     | 2 hours  | 2.0x           |
| 3     | 8              | 2,400 Coins   | 6 hours  | 5.0x           |
| 4     | 10             | 5,400 Coins   | 12 hours | 8.0x           |
| 5     | 12             | 9,600 Coins   | 18 hours | 11.0x          |
| 6     | 15             | 15,000 Coins  | 24 hours | 14.0x          |

## 🎯 Hero Rarity System

| Rarity      | Probability | Power | Speed | Stamina | HP      | Bomb# | Bomb Range |
|-------------|-------------|-------|-------|---------|---------|-------|------------|
| Common      | 84.00%      | 1-3   | 1-2   | 3-5     | 50-100  | 1     | 1-2        |
| Uncommon    | 10.00%      | 3-5   | 2-3   | 5-8     | 100-150 | 1-2   | 2-3        |
| Rare        | 4.50%       | 5-8   | 3-5   | 8-12    | 150-250 | 2     | 3-4        |
| Super Rare  | 1.00%       | 8-12  | 5-7   | 12-18   | 250-400 | 2-3   | 4-5        |
| Epic        | 0.40%       | 12-18 | 7-10  | 18-25   | 400-600 | 3     | 5-6        |
| Legendary   | 0.10%       | 18-25 | 10-15 | 25-35   | 600-1000| 3-4   | 6-8        |

## 💰 Economy

### Costs & Fees
- **House Entry**: 0.25 SOL (100% to dev treasury)
- **Hero Mint**: 100 Coins (50% burned, 50% to reward pool)
- **Claim Tax**: 2.5% (to treasury/burn)
- **Referral Bonus**: 2.5% (to referrer on every claim)

### Token Supply
- **Total Supply**: 100,000,000 (100M)
- **Decimals**: 6
- **Mint Authority**: Game PDA (no private key access)

## 🛠️ Build Instructions

### Prerequisites

**IMPORTANT**: This project requires Rust 1.85.0 or newer due to dependencies that use `edition2024`.

```bash
# Install Rust 1.85.0 or newer
rustup install 1.85.0
rustup default 1.85.0

# Install Solana CLI (v3.1.6+)
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Install Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor --tag v0.32.1 anchor-cli
```

### Known Issues

If you encounter errors about `edition2024` being required:

```
error: feature `edition2024` is required
```

This means your system is using an older version of Cargo (1.84.0 or earlier). Solutions:

1. **Update Rust**: `rustup update`
2. **Remove conflicting installations**: If you have Rust installed via Homebrew, it may conflict with rustup:
   ```bash
   # Temporarily disable Homebrew's Rust
   brew unlink rust
   ```
3. **Use rustup explicitly**: Ensure rustup's bin directory is first in PATH:
   ```bash
   export PATH="$HOME/.cargo/bin:$PATH"
   ```

### Building

```bash
# Clean build
rm -rf target Cargo.lock
anchor build

# Run tests
anchor test
```

## 📦 Project Structure

```
solana_bomber/
├── programs/
│   └── solana_bomber/
│       ├── src/
│       │   ├── lib.rs          # Main program logic
│       │   ├── state.rs        # Account structures
│       │   ├── utils.rs        # Helper functions
│       │   └── errors.rs       # Error codes
│       └── Cargo.toml
├── tests/                      # Integration tests
├── Anchor.toml                 # Anchor configuration
└── Cargo.toml                  # Workspace configuration
```

## 🔧 Instructions Implemented

1. **initialize_global_state** - Setup game and create SPL token with PDA mint authority
2. **initialize_user** - Pay 0.25 SOL entry fee, create user account
3. **set_referrer** - Set referrer (one-time, cannot refer self)
4. **mint_hero** - Spend 100 coins for random hero (50% burn, 50% pool)
5. **upgrade_house** - Upgrade to next level (costs coins, has cooldown)
6. **move_hero_to_house** - Move hero from inventory to house (max 21)
7. **move_hero_to_map** - Send hero mining (max 15, requires HP > 0)
8. **move_hero_to_restroom** - Assign hero to boosted recovery slot
9. **remove_hero_from_house** - Return hero to inventory
10. **claim_rewards** - Calculate and mint rewards based on HMP × time
11. **recover_hp** - Recover HP for heroes in house (bench/restroom)
12. **set_paused** - Admin emergency stop

## 🎮 Gameplay Flow

```
1. Player pays 0.25 SOL → initialize_user()
2. Player earns coins via claims/airdrops
3. Player spends 100 coins → mint_hero() → Random rarity
4. Player moves heroes:
   - Inventory → House (max 21)
   - House → Map (max 15, starts mining)
   - House → Restroom (boosted recovery)
5. Heroes on map:
   - Earn rewards based on HMP
   - Drain HP based on Speed
   - When HP = 0, stop mining
6. Player claims rewards:
   - Rewards = HMP × Time × Phase Rate
   - 2.5% claim tax
   - 2.5% to referrer (if set)
7. Player upgrades house:
   - Unlocks more restroom slots
   - Faster HP recovery multiplier
   - Requires coins + cooldown
```

## 🔒 Security Features

- ✅ Mint authority controlled by PDA (no private key)
- ✅ All state changes validated on-chain
- ✅ Max limits enforced (21 house, 15 map)
- ✅ No NFT metadata (gas optimization)
- ✅ Supply cap enforced (100M total)
- ✅ Emergency pause functionality
- ✅ Cooldown timers for upgrades
- ✅ Referral cannot be changed once set

## 📊 Example Scenario

**Setup:**
- 15 active heroes with total HMP = 100
- Phase 1 rate = 10 coins per HMP per hour
- Mining for 1 hour

**Rewards:**
```
Gross Reward = 1 hour × 100 HMP × 10 rate = 1,000 coins
Claim Tax (2.5%) = 25 coins
Referral Bonus (2.5%) = 25 coins (to referrer)
Net to Player = 950 coins (+ added to internal balance for minting)
```

**HP Drain** (example hero with Speed 5):
```
HP Drained = (3600 seconds / 60) × 5 = 300 HP per hour
```

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please ensure:
1. Code follows Anchor best practices
2. All formulas match the GDD specifications
3. Tests cover new functionality
4. Documentation is updated

## 📞 Support

For issues, questions, or suggestions, please open an issue on GitHub.

---

**Built with ❤️ on Solana**
