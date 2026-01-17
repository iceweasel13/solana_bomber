use anchor_lang::prelude::*;

#[error_code]
pub enum GameError {
    // ========== Game State Errors ==========
    #[msg("Game is currently paused")]
    GamePaused,

    #[msg("Game has not started yet")]
    GameNotStarted,

    #[msg("Hero minting is currently disabled")]
    MintingDisabled,

    #[msg("House upgrades are currently disabled")]
    HouseUpgradesDisabled,

    #[msg("Unauthorized: Admin only")]
    Unauthorized,

    // ========== Economic Errors ==========
    #[msg("Insufficient coins for this action")]
    InsufficientCoins,

    #[msg("Insufficient SOL for this action")]
    InsufficientSOL,

    #[msg("Invalid burn percentage (must be 0-10000)")]
    InvalidBurnPercentage,

    #[msg("Invalid referral fee (must be 0-10000)")]
    InvalidReferralFee,

    // ========== Hero Errors ==========
    #[msg("Invalid hero index")]
    InvalidHeroIndex,

    #[msg("Hero is sleeping (HP = 0), must recover first")]
    HeroIsSleeping,

    #[msg("Hero is not in inventory")]
    HeroNotInInventory,

    #[msg("Hero is already on the map")]
    HeroAlreadyOnMap,

    #[msg("Invalid hero quantity (must be 1-10)")]
    InvalidHeroQuantity,

    // ========== Grid/House Errors ==========
    #[msg("House not initialized - purchase initial house first")]
    HouseNotInitialized,

    #[msg("Invalid grid coordinates")]
    InvalidGridCoordinates,

    #[msg("Grid position is already occupied")]
    GridPositionOccupied,

    #[msg("Grid position is empty")]
    GridPositionEmpty,

    #[msg("Hero is not on the grid")]
    HeroNotOnGrid,

    #[msg("Maximum house level (6) already reached")]
    MaxHouseLevelReached,

    #[msg("House upgrade cooldown is still active")]
    UpgradeCooldownActive,

    // ========== Map Errors ==========
    #[msg("Map is full (max 15 heroes)")]
    MapFull,

    #[msg("No heroes currently on map")]
    NoHeroesOnMap,

    #[msg("Hero is not on the map")]
    HeroNotOnMap,

    #[msg("No active heroes with HP > 0")]
    NoActiveHeroes,

    // ========== Restroom Errors ==========
    #[msg("Restroom is full")]
    RestroomFull,

    #[msg("Hero is not in a restroom")]
    HeroNotInRestroom,

    // ========== Reward Errors ==========
    #[msg("No rewards to claim")]
    NoRewardsToClaim,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Division by zero")]
    DivisionByZero,

    #[msg("Invalid calculation result")]
    InvalidCalculation,

    // ========== Referral Errors ==========
    #[msg("Referrer has already been set")]
    ReferrerAlreadySet,

    #[msg("Cannot refer yourself")]
    CannotReferSelf,

    #[msg("Invalid referrer account")]
    InvalidReferrer,

    // ========== Account Errors ==========
    #[msg("Account already initialized")]
    AlreadyInitialized,

    #[msg("Invalid account owner")]
    InvalidOwner,
}
