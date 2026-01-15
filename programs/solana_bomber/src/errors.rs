use anchor_lang::prelude::*;

#[error_code]
pub enum GameError {
    #[msg("Game is currently paused")]
    GamePaused,

    #[msg("Insufficient coins for this action")]
    InsufficientCoins,

    #[msg("Invalid hero index")]
    InvalidHeroIndex,

    #[msg("House is full (max 21 heroes)")]
    HouseFull,

    #[msg("Map is full (max 15 heroes)")]
    MapFull,

    #[msg("Restroom is full")]
    RestroomFull,

    #[msg("Hero is already in house")]
    HeroAlreadyInHouse,

    #[msg("Hero is already on map")]
    HeroAlreadyOnMap,

    #[msg("Hero is not in house")]
    HeroNotInHouse,

    #[msg("Hero is sleeping (HP = 0), must recover first")]
    HeroIsSleeping,

    #[msg("No heroes currently on map")]
    NoHeroesOnMap,

    #[msg("No active heroes with HP > 0")]
    NoActiveHeroes,

    #[msg("No rewards to claim")]
    NoRewardsToClai,

    #[msg("House upgrade cooldown is still active")]
    UpgradeCooldownActive,

    #[msg("Maximum house level (6) already reached")]
    MaxHouseLevelReached,

    #[msg("Referrer has already been set")]
    ReferrerAlreadySet,

    #[msg("Cannot refer yourself")]
    CannotReferSelf,

    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,

    #[msg("Invalid calculation result")]
    InvalidCalculation,
}
