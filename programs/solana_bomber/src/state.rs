use anchor_lang::prelude::*;

/// Global game state - singleton PDA
#[account]
pub struct GlobalState {
    /// Admin authority (can pause/unpause game)
    pub authority: Pubkey,

    /// The SPL Token mint for game rewards
    pub reward_token_mint: Pubkey,

    /// Total coins mined (for halving logic)
    pub total_mined: u64,

    /// Total coins burned from hero minting
    pub total_burned: u64,

    /// Reward pool from 50% of mint fees
    pub reward_pool: u64,

    /// Developer treasury for SOL fees
    pub dev_treasury: Pubkey,

    /// Emergency pause flag
    pub paused: bool,

    /// Total heroes minted across all players (tracking)
    pub total_heroes_minted: u64,

    /// Bump seed for PDA
    pub bump: u8,
}

impl GlobalState {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // reward_token_mint
        8 + // total_mined
        8 + // total_burned
        8 + // reward_pool
        32 + // dev_treasury
        1 + // paused
        8 + // total_heroes_minted
        1; // bump
}

/// Per-player account - stores all game state for one user
#[account]
pub struct UserAccount {
    /// Owner wallet
    pub owner: Pubkey,

    /// Current house level (1-6)
    pub house_level: u8,

    /// Timestamp when last house upgrade started (for cooldown)
    pub house_upgrade_start: i64,

    /// In-game coin balance (not SPL tokens, internal currency)
    pub coin_balance: u64,

    /// Referrer wallet (gets 2.5% on every claim)
    pub referrer: Option<Pubkey>,

    /// All owned heroes (unlimited capacity)
    pub inventory: Vec<Hero>,

    /// Heroes currently in the house (max 21)
    /// Stores indices into inventory Vec
    pub active_house: Vec<u16>,

    /// Heroes currently mining on map (max 15)
    /// Stores indices into inventory Vec
    pub active_map: Vec<u16>,

    /// Heroes in restroom slots (subset of active_house)
    /// Count depends on house_level: Lv1=4, Lv2=6, Lv3=8, Lv4=10, Lv5=12, Lv6=15
    /// Stores indices into inventory Vec
    pub restroom_slots: Vec<u16>,

    /// Bump seed for PDA
    pub bump: u8,
}

impl UserAccount {
    /// Base size (without dynamic Vecs)
    pub const BASE_LEN: usize = 8 + // discriminator
        32 + // owner
        1 + // house_level
        8 + // house_upgrade_start
        8 + // coin_balance
        33 + // referrer (1 + 32)
        4 + // inventory vec length
        4 + // active_house vec length
        4 + // active_map vec length
        4 + // restroom_slots vec length
        1; // bump

    /// Get restroom capacity based on house level
    pub fn get_restroom_capacity(&self) -> u8 {
        match self.house_level {
            1 => 4,
            2 => 6,
            3 => 8,
            4 => 10,
            5 => 12,
            6 => 15,
            _ => 4, // Default to level 1
        }
    }

    /// Get recovery multiplier for restroom (as basis points, e.g., 200 = 2.0x)
    pub fn get_restroom_multiplier(&self) -> u16 {
        match self.house_level {
            1 => 100,   // 1.0x (same as bench)
            2 => 200,   // 2.0x
            3 => 500,   // 5.0x
            4 => 800,   // 8.0x
            5 => 1100,  // 11.0x
            6 => 1400,  // 14.0x
            _ => 100,   // Default
        }
    }

    /// Get house upgrade cost in coins
    pub fn get_upgrade_cost(&self) -> u64 {
        match self.house_level {
            1 => 720,      // Upgrade to Lv2
            2 => 2_400,    // Upgrade to Lv3
            3 => 5_400,    // Upgrade to Lv4
            4 => 9_600,    // Upgrade to Lv5
            5 => 15_000,   // Upgrade to Lv6
            _ => u64::MAX, // Can't upgrade beyond Lv6
        }
    }

    /// Get house upgrade cooldown in seconds
    pub fn get_upgrade_cooldown(&self) -> i64 {
        match self.house_level {
            1 => 2 * 3600,   // 2 hours
            2 => 6 * 3600,   // 6 hours
            3 => 12 * 3600,  // 12 hours
            4 => 18 * 3600,  // 18 hours
            5 => 24 * 3600,  // 24 hours
            _ => 0,          // No cooldown for Lv6 (max level)
        }
    }
}

/// Individual hero struct (NOT an NFT, just a data struct)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Hero {
    /// Unique ID within user's inventory (0-based index)
    pub id: u16,

    /// Hero rarity (affects stat ranges)
    pub rarity: HeroRarity,

    /// Power stat (affects HMP and reward)
    pub power: u32,

    /// Speed stat (affects HMP and HP drain)
    pub speed: u32,

    /// Stamina stat (affects HP recovery rate)
    pub stamina: u32,

    /// Max stamina (upper limit for recovery)
    pub max_stamina: u32,

    /// Bomb number (multiplier for power and HP drain)
    pub bomb_number: u8,

    /// Bomb range (affects HMP calculation)
    pub bomb_range: u8,

    /// Current HP
    pub hp: u32,

    /// Maximum HP
    pub max_hp: u32,

    /// Last action timestamp (for time-delta calculations)
    pub last_action_time: i64,
}

impl Hero {
    pub const LEN: usize =
        2 + // id
        1 + // rarity
        4 + // power
        4 + // speed
        4 + // stamina
        4 + // max_stamina
        1 + // bomb_number
        1 + // bomb_range
        4 + // hp
        4 + // max_hp
        8; // last_action_time

    /// Calculate this hero's mining power (HMP)
    /// Formula: (Power × Bomb_Number) + (Bomb_Range × 0.5) + (Speed × 2)
    pub fn calculate_hmp(&self) -> f64 {
        let power_component = (self.power * self.bomb_number as u32) as f64;
        let range_component = (self.bomb_range as f64) * 0.5;
        let speed_component = (self.speed as f64) * 2.0;

        power_component + range_component + speed_component
    }

    /// Calculate HP drained over time (Speed-based)
    /// Formula: (Elapsed_Seconds / 60) × Speed
    /// Speed 1 = 1 HP per minute, Speed 5 = 5 HP per minute
    pub fn calculate_hp_drain(&self, elapsed_seconds: u64) -> u32 {
        let minutes = elapsed_seconds / 60;
        (minutes * self.speed as u64) as u32
    }

    /// Check if hero is sleeping (HP = 0)
    pub fn is_sleeping(&self) -> bool {
        self.hp == 0
    }
}

/// Hero rarity tiers with their probabilities
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum HeroRarity {
    Common,      // 84.00%
    Uncommon,    // 10.00%
    Rare,        // 4.50%
    SuperRare,   // 1.00%
    Epic,        // 0.40%
    Legendary,   // 0.10%
}

impl HeroRarity {
    /// Roll a random rarity using a seed (0-9999)
    pub fn roll(seed: u16) -> Self {
        match seed {
            0..=8399 => HeroRarity::Common,
            8400..=9399 => HeroRarity::Uncommon,
            9400..=9849 => HeroRarity::Rare,
            9850..=9949 => HeroRarity::SuperRare,
            9950..=9989 => HeroRarity::Epic,
            9990..=9999 => HeroRarity::Legendary,
            _ => HeroRarity::Common, // Fallback
        }
    }

    /// Get stat ranges for this rarity [min, max]
    pub fn get_power_range(&self) -> (u32, u32) {
        match self {
            HeroRarity::Common => (1, 3),
            HeroRarity::Uncommon => (3, 5),
            HeroRarity::Rare => (5, 8),
            HeroRarity::SuperRare => (8, 12),
            HeroRarity::Epic => (12, 18),
            HeroRarity::Legendary => (18, 25),
        }
    }

    pub fn get_speed_range(&self) -> (u32, u32) {
        match self {
            HeroRarity::Common => (1, 2),
            HeroRarity::Uncommon => (2, 3),
            HeroRarity::Rare => (3, 5),
            HeroRarity::SuperRare => (5, 7),
            HeroRarity::Epic => (7, 10),
            HeroRarity::Legendary => (10, 15),
        }
    }

    pub fn get_stamina_range(&self) -> (u32, u32) {
        match self {
            HeroRarity::Common => (3, 5),
            HeroRarity::Uncommon => (5, 8),
            HeroRarity::Rare => (8, 12),
            HeroRarity::SuperRare => (12, 18),
            HeroRarity::Epic => (18, 25),
            HeroRarity::Legendary => (25, 35),
        }
    }

    pub fn get_bomb_number_range(&self) -> (u8, u8) {
        match self {
            HeroRarity::Common => (1, 1),
            HeroRarity::Uncommon => (1, 2),
            HeroRarity::Rare => (2, 2),
            HeroRarity::SuperRare => (2, 3),
            HeroRarity::Epic => (3, 3),
            HeroRarity::Legendary => (3, 4),
        }
    }

    pub fn get_bomb_range_range(&self) -> (u8, u8) {
        match self {
            HeroRarity::Common => (1, 2),
            HeroRarity::Uncommon => (2, 3),
            HeroRarity::Rare => (3, 4),
            HeroRarity::SuperRare => (4, 5),
            HeroRarity::Epic => (5, 6),
            HeroRarity::Legendary => (6, 8),
        }
    }

    pub fn get_hp_range(&self) -> (u32, u32) {
        match self {
            HeroRarity::Common => (50, 100),
            HeroRarity::Uncommon => (100, 150),
            HeroRarity::Rare => (150, 250),
            HeroRarity::SuperRare => (250, 400),
            HeroRarity::Epic => (400, 600),
            HeroRarity::Legendary => (600, 1000),
        }
    }
}

/// House upgrade information
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug)]
pub struct HouseUpgradeConfig {
    pub level: u8,
    pub restroom_slots: u8,
    pub cost_coins: u64,
    pub cooldown_seconds: i64,
    pub recovery_multiplier: u16, // Basis points (100 = 1.0x)
}

impl HouseUpgradeConfig {
    pub const LEVELS: [HouseUpgradeConfig; 6] = [
        HouseUpgradeConfig {
            level: 1,
            restroom_slots: 4,
            cost_coins: 0, // Entry is 0.25 SOL, not coins
            cooldown_seconds: 0,
            recovery_multiplier: 100, // 1.0x
        },
        HouseUpgradeConfig {
            level: 2,
            restroom_slots: 6,
            cost_coins: 720,
            cooldown_seconds: 2 * 3600,
            recovery_multiplier: 200, // 2.0x
        },
        HouseUpgradeConfig {
            level: 3,
            restroom_slots: 8,
            cost_coins: 2_400,
            cooldown_seconds: 6 * 3600,
            recovery_multiplier: 500, // 5.0x
        },
        HouseUpgradeConfig {
            level: 4,
            restroom_slots: 10,
            cost_coins: 5_400,
            cooldown_seconds: 12 * 3600,
            recovery_multiplier: 800, // 8.0x
        },
        HouseUpgradeConfig {
            level: 5,
            restroom_slots: 12,
            cost_coins: 9_600,
            cooldown_seconds: 18 * 3600,
            recovery_multiplier: 1100, // 11.0x
        },
        HouseUpgradeConfig {
            level: 6,
            restroom_slots: 15,
            cost_coins: 15_000,
            cooldown_seconds: 24 * 3600,
            recovery_multiplier: 1400, // 14.0x
        },
    ];
}
