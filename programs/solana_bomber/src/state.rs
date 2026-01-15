use anchor_lang::prelude::*;

/// Global game state - singleton PDA with dynamic configuration
#[account]
pub struct GlobalState {
    // ========== Core Identity ==========
    /// Admin authority (owner)
    pub authority: Pubkey,

    /// Treasury wallet (bombtoshi)
    pub dev_treasury: Pubkey,

    /// BOMBcoin SPL Token mint
    pub reward_token_mint: Pubkey,

    // ========== Game State ==========
    /// Has the game started?
    pub game_has_started: bool,

    /// Emergency pause flag
    pub paused: bool,

    /// Block/timestamp when game started
    pub start_block: i64,

    /// Total number of houses initialized
    pub house_count: u64,

    /// Total unique heroes minted globally
    pub unique_heroes_count: u64,

    /// Total hash power (sum of all active players' power)
    pub total_hash_power: u64,

    /// Cumulative BOMBcoin per power (MasterChef-style accounting)
    pub cumulative_bombcoin_per_power: u128,

    // ========== Dynamic Economic Parameters ==========
    /// Initial house purchase price (SOL, in lamports)
    pub initial_house_price: u64,

    /// Base reward rate (BOMBcoin per hour at phase 1)
    pub initial_bombcoin_per_block: u64,

    /// Halving interval (supply milestone for rate reduction)
    pub halving_interval: u64,

    /// Burn percentage (0-10000, where 10000 = 100%)
    pub burn_pct: u16,

    /// Referral fee percentage (0-10000, where 10000 = 100%)
    pub referral_fee: u16,

    /// Rewards calculation precision multiplier
    pub rewards_precision: u64,

    // ========== Accounting ==========
    /// Total BOMBcoin mined (for halving logic)
    pub total_mined: u64,

    /// Total coins burned from hero minting
    pub total_burned: u64,

    /// Reward pool from minting fees
    pub reward_pool: u64,

    /// PDA bump seed
    pub bump: u8,
}

impl GlobalState {
    pub const LEN: usize = 8 + // discriminator
        32 + // authority
        32 + // dev_treasury
        32 + // reward_token_mint
        1 + // game_has_started
        1 + // paused
        8 + // start_block
        8 + // house_count
        8 + // unique_heroes_count
        8 + // total_hash_power
        16 + // cumulative_bombcoin_per_power
        8 + // initial_house_price
        8 + // initial_bombcoin_per_block
        8 + // halving_interval
        2 + // burn_pct
        2 + // referral_fee
        8 + // rewards_precision
        8 + // total_mined
        8 + // total_burned
        8 + // reward_pool
        1; // bump

    /// Calculate current BOMBcoin per block based on halving
    pub fn get_bombcoin_per_block(&self) -> u64 {
        if self.halving_interval == 0 {
            return self.initial_bombcoin_per_block;
        }

        let halvings = self.total_mined / self.halving_interval;
        let mut rate = self.initial_bombcoin_per_block;

        for _ in 0..halvings {
            rate = rate / 2;
            if rate == 0 {
                break;
            }
        }

        rate
    }

    /// Calculate blocks until next halving
    pub fn blocks_until_next_halving(&self) -> u64 {
        if self.halving_interval == 0 {
            return u64::MAX;
        }

        let next_milestone = ((self.total_mined / self.halving_interval) + 1) * self.halving_interval;
        next_milestone.saturating_sub(self.total_mined)
    }
}

/// House tile in the grid (each position can contain a hero)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct HouseTile {
    /// X coordinate in grid
    pub x: u8,

    /// Y coordinate in grid
    pub y: u8,

    /// Hero inventory index (u16::MAX if empty)
    pub hero_id: u16,

    /// Is this tile a restroom (boosted recovery)?
    pub is_restroom: bool,
}

impl HouseTile {
    pub fn is_empty(&self) -> bool {
        self.hero_id == u16::MAX
    }

    pub fn empty(x: u8, y: u8) -> Self {
        Self {
            x,
            y,
            hero_id: u16::MAX,
            is_restroom: false,
        }
    }
}

/// House grid dimensions by level
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct GridDimensions {
    pub width: u8,
    pub height: u8,
}

impl GridDimensions {
    /// Get grid size for a given house level
    pub fn for_level(level: u8) -> Self {
        match level {
            1 => Self { width: 4, height: 4 },  // 16 tiles
            2 => Self { width: 4, height: 6 },  // 24 tiles
            3 => Self { width: 5, height: 6 },  // 30 tiles
            4 => Self { width: 6, height: 6 },  // 36 tiles
            5 => Self { width: 6, height: 7 },  // 42 tiles
            6 => Self { width: 7, height: 7 },  // 49 tiles
            _ => Self { width: 4, height: 4 },  // Default to level 1
        }
    }

    /// Get maximum restroom slots for a given house level
    pub fn max_restroom_slots(level: u8) -> usize {
        match level {
            1 => 4,
            2 => 6,
            3 => 8,
            4 => 10,
            5 => 12,
            6 => 15,
            _ => 4,
        }
    }

    /// Get upgrade cost in coins for next level
    pub fn upgrade_cost(current_level: u8) -> u64 {
        match current_level {
            1 => 500,
            2 => 1000,
            3 => 2000,
            4 => 4000,
            5 => 8000,
            _ => 0,
        }
    }

    /// Get upgrade cooldown in seconds
    pub fn upgrade_cooldown(current_level: u8) -> i64 {
        match current_level {
            1 => 3600,      // 1 hour
            2 => 7200,      // 2 hours
            3 => 14400,     // 4 hours
            4 => 28800,     // 8 hours
            5 => 57600,     // 16 hours
            _ => 0,
        }
    }
}

/// Hero rarity tiers (affects drop rates and stat ranges)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub enum HeroRarity {
    Common,      // 50% drop rate
    Uncommon,    // 30% drop rate
    Rare,        // 15% drop rate
    SuperRare,   // 4% drop rate
    Epic,        // 0.9% drop rate
    Legendary,   // 0.1% drop rate
}

impl HeroRarity {
    /// Determine rarity from a random value (0-1000)
    pub fn from_roll(roll: u16) -> Self {
        match roll {
            0..=499 => HeroRarity::Common,
            500..=799 => HeroRarity::Uncommon,
            800..=949 => HeroRarity::Rare,
            950..=989 => HeroRarity::SuperRare,
            990..=998 => HeroRarity::Epic,
            999..=1000 => HeroRarity::Legendary,
            _ => HeroRarity::Common,
        }
    }

    /// Get stat ranges for this rarity
    pub fn stat_range(&self) -> (u32, u32) {
        match self {
            HeroRarity::Common => (10, 30),
            HeroRarity::Uncommon => (25, 50),
            HeroRarity::Rare => (45, 75),
            HeroRarity::SuperRare => (70, 100),
            HeroRarity::Epic => (95, 130),
            HeroRarity::Legendary => (125, 160),
        }
    }

    /// Get bomb count range for this rarity
    pub fn bomb_count_range(&self) -> (u8, u8) {
        match self {
            HeroRarity::Common => (1, 1),
            HeroRarity::Uncommon => (1, 2),
            HeroRarity::Rare => (2, 2),
            HeroRarity::SuperRare => (2, 3),
            HeroRarity::Epic => (3, 4),
            HeroRarity::Legendary => (4, 5),
        }
    }

    /// Get bomb range for this rarity
    pub fn bomb_range_range(&self) -> (u8, u8) {
        match self {
            HeroRarity::Common => (1, 2),
            HeroRarity::Uncommon => (2, 3),
            HeroRarity::Rare => (3, 4),
            HeroRarity::SuperRare => (4, 5),
            HeroRarity::Epic => (5, 6),
            HeroRarity::Legendary => (6, 7),
        }
    }
}

/// Individual hero (template-based with 9 skin archetypes)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct Hero {
    /// Unique ID within user's inventory
    pub id: u16,

    /// Visual skin template (1-9 fixed archetypes)
    pub skin_id: u8,

    /// Hero rarity (determines stats and drop rate)
    pub rarity: HeroRarity,

    /// Power stat (affects HMP and reward)
    pub power: u32,

    /// Speed stat (affects HMP and HP drain)
    pub speed: u32,

    /// Stamina stat (affects HP recovery rate)
    pub stamina: u32,

    /// Max stamina cap
    pub max_stamina: u32,

    /// Bomb count (multiplier for power and HP drain)
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
    /// Calculate HMP (Hero Mining Power)
    /// Formula: HMP = (Power × Bomb_Count) + (Bomb_Range × 0.5) + (Speed × 2)
    pub fn calculate_hmp(&self) -> f64 {
        let power_component = (self.power * self.bomb_number as u32) as f64;
        let range_component = (self.bomb_range as f64) * 0.5;
        let speed_component = (self.speed as f64) * 2.0;
        power_component + range_component + speed_component
    }

    /// Calculate HP drain over time
    /// Formula: HP drain = (Elapsed_Seconds / 60) × Hero_Speed
    pub fn calculate_hp_drain(&self, elapsed_seconds: u64) -> u32 {
        let minutes = elapsed_seconds / 60;
        (minutes * self.speed as u64) as u32
    }

    /// Calculate HP recovery over time
    /// Formula: HP Recovery = (Elapsed_Seconds / 120) × Stamina × Location_Multiplier
    pub fn calculate_hp_recovery(&self, elapsed_seconds: u64, location_multiplier: f64) -> u32 {
        let ticks = elapsed_seconds / 120; // 120-second intervals
        let base_recovery = (ticks * self.stamina as u64) as f64;
        (base_recovery * location_multiplier) as u32
    }

    /// Check if hero is sleeping (HP = 0)
    pub fn is_sleeping(&self) -> bool {
        self.hp == 0
    }

    /// Check if hero is active (HP > 0)
    pub fn is_active(&self) -> bool {
        self.hp > 0
    }
}

/// Per-player account - stores all game state for one user
#[account]
pub struct UserAccount {
    /// Owner wallet
    pub owner: Pubkey,

    // ========== House System ==========
    /// Has player purchased initial house?
    pub initialized_starter_house: bool,

    /// Current house level (1-6)
    pub house_level: u8,

    /// Timestamp of last house upgrade (for cooldown)
    pub last_house_upgrade_timestamp: i64,

    /// Grid dimensions based on house level
    pub grid_width: u8,
    pub grid_height: u8,

    /// House grid tiles (expandable matrix)
    /// Vector of occupied tiles with coordinates and hero IDs
    pub house_occupied_coords: Vec<HouseTile>,

    // ========== Heroes ==========
    /// All owned heroes (unlimited capacity)
    pub inventory: Vec<Hero>,

    /// Heroes currently active on map (mining)
    /// Stores indices into inventory Vec
    pub active_map: Vec<u16>,

    // ========== Economy ==========
    /// In-game coin balance (not SPL tokens)
    pub coin_balance: u64,

    /// Total mining power (cached sum of active heroes' HMP)
    pub player_power: u64,

    /// Pending unclaimed BOMBcoin rewards
    pub player_pending_rewards: u64,

    /// Last block when rewards were claimed
    pub last_reward_block: i64,

    /// Reward debt (for MasterChef accounting)
    pub reward_debt: u128,

    // ========== Referral System ==========
    /// Referrer wallet (can only be set once)
    pub referrer: Option<Pubkey>,

    /// Total bonus paid from referrals
    pub referral_bonus_paid: u64,

    /// List of users referred by this player
    pub referrals: Vec<Pubkey>,

    /// PDA bump seed
    pub bump: u8,
}

impl UserAccount {
    // Maximum size estimate (variable due to Vecs)
    // Base size + reasonable maximums for vectors
    pub const MAX_LEN: usize = 8 + // discriminator
        32 + // owner
        1 + // initialized_starter_house
        1 + // house_level
        8 + // last_house_upgrade_timestamp
        1 + // grid_width
        1 + // grid_height
        4 + (50 * 6) + // house_occupied_coords (max ~50 tiles)
        4 + (100 * 120) + // inventory (max ~100 heroes, ~120 bytes each)
        4 + (15 * 2) + // active_map (max 15 heroes)
        8 + // coin_balance
        8 + // player_power
        8 + // player_pending_rewards
        8 + // last_reward_block
        16 + // reward_debt
        1 + 32 + // referrer (Option<Pubkey>)
        8 + // referral_bonus_paid
        4 + (50 * 32) + // referrals (max ~50 referrals)
        1; // bump

    /// Get current house upgrade cost
    pub fn get_upgrade_cost(&self) -> u64 {
        GridDimensions::upgrade_cost(self.house_level)
    }

    /// Get current house upgrade cooldown duration
    pub fn get_upgrade_cooldown(&self) -> i64 {
        GridDimensions::upgrade_cooldown(self.house_level)
    }

    /// Get max restroom slots for current house level
    pub fn get_max_restroom_slots(&self) -> usize {
        GridDimensions::max_restroom_slots(self.house_level)
    }

    /// Count current restroom slots in use
    pub fn count_restroom_slots(&self) -> usize {
        self.house_occupied_coords
            .iter()
            .filter(|tile| tile.is_restroom && !tile.is_empty())
            .count()
    }

    /// Find hero on grid by inventory index
    pub fn find_hero_on_grid(&self, hero_index: u16) -> Option<&HouseTile> {
        self.house_occupied_coords
            .iter()
            .find(|tile| tile.hero_id == hero_index)
    }

    /// Check if coordinate is valid for current grid
    pub fn is_valid_coord(&self, x: u8, y: u8) -> bool {
        x < self.grid_width && y < self.grid_height
    }

    /// Check if coordinate is occupied
    pub fn is_coord_occupied(&self, x: u8, y: u8) -> bool {
        self.house_occupied_coords
            .iter()
            .any(|tile| tile.x == x && tile.y == y && !tile.is_empty())
    }
}
