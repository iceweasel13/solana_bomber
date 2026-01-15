use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

pub mod state;
pub mod utils;
pub mod errors;

use state::*;
use utils::*;
use errors::*;

declare_id!("97R9ZM4v9TRZS39cTEgQfr6Ur3N32YhKzcCYNozgqBX7");

#[program]
pub mod solana_bomber {
    use super::*;

    // ========================================================================
    // ADMIN FUNCTIONS
    // ========================================================================

    /// Initialize the global game state with dynamic configuration (admin only, one-time)
    pub fn initialize_global_state(
        ctx: Context<InitializeGlobalState>,
        dev_treasury: Pubkey,
        initial_house_price: u64,
        initial_bombcoin_per_block: u64,
        halving_interval: u64,
        burn_pct: u16,
        referral_fee: u16,
        rewards_precision: u64,
    ) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;

        // Validate percentages (0-10000 basis points = 0-100%)
        require!(burn_pct <= 10_000, GameError::InvalidBurnPercentage);
        require!(referral_fee <= 10_000, GameError::InvalidReferralFee);

        // Core Identity
        global_state.authority = ctx.accounts.authority.key();
        global_state.dev_treasury = dev_treasury;
        global_state.reward_token_mint = ctx.accounts.reward_token_mint.key();

        // Game State
        global_state.game_has_started = false;
        global_state.paused = false;
        global_state.minting_enabled = true;
        global_state.house_upgrades_enabled = true;
        global_state.start_block = 0;
        global_state.house_count = 0;
        global_state.unique_heroes_count = 0;
        global_state.total_hash_power = 0;
        global_state.cumulative_bombcoin_per_power = 0;

        // Dynamic Economic Parameters
        global_state.initial_house_price = initial_house_price;
        global_state.initial_bombcoin_per_block = initial_bombcoin_per_block;
        global_state.halving_interval = halving_interval;
        global_state.burn_pct = burn_pct;
        global_state.referral_fee = referral_fee;
        global_state.rewards_precision = rewards_precision;

        // Accounting
        global_state.total_mined = 0;
        global_state.total_burned = 0;
        global_state.reward_pool = 0;
        global_state.bump = ctx.bumps.global_state;

        msg!("Global state initialized with dynamic config");
        msg!("Initial house price: {} lamports", initial_house_price);
        msg!("Bombcoin per block: {}", initial_bombcoin_per_block);
        msg!("Halving interval: {}", halving_interval);
        msg!("Burn %: {} bps, Referral %: {} bps", burn_pct, referral_fee);

        Ok(())
    }

    /// Update dynamic game configuration (admin only)
    pub fn update_game_config(
        ctx: Context<AdminAction>,
        initial_house_price: Option<u64>,
        initial_bombcoin_per_block: Option<u64>,
        halving_interval: Option<u64>,
        burn_pct: Option<u16>,
        referral_fee: Option<u16>,
        rewards_precision: Option<u64>,
    ) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;

        if let Some(price) = initial_house_price {
            global_state.initial_house_price = price;
            msg!("Updated house price: {}", price);
        }

        if let Some(rate) = initial_bombcoin_per_block {
            global_state.initial_bombcoin_per_block = rate;
            msg!("Updated bombcoin per block: {}", rate);
        }

        if let Some(interval) = halving_interval {
            global_state.halving_interval = interval;
            msg!("Updated halving interval: {}", interval);
        }

        if let Some(burn) = burn_pct {
            require!(burn <= 10_000, GameError::InvalidBurnPercentage);
            global_state.burn_pct = burn;
            msg!("Updated burn %: {} bps", burn);
        }

        if let Some(referral) = referral_fee {
            require!(referral <= 10_000, GameError::InvalidReferralFee);
            global_state.referral_fee = referral;
            msg!("Updated referral fee: {} bps", referral);
        }

        if let Some(precision) = rewards_precision {
            global_state.rewards_precision = precision;
            msg!("Updated rewards precision: {}", precision);
        }

        msg!("Game config updated");
        Ok(())
    }

    /// Update treasury wallet (admin only)
    pub fn set_treasury(ctx: Context<AdminAction>, new_treasury: Pubkey) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.dev_treasury = new_treasury;

        msg!("Treasury updated to: {}", new_treasury);
        Ok(())
    }

    /// Start the game (admin only, can only be called once)
    pub fn start_game(ctx: Context<AdminAction>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let clock = Clock::get()?;

        require!(!global_state.game_has_started, GameError::AlreadyInitialized);

        global_state.game_has_started = true;
        global_state.start_block = clock.unix_timestamp;

        msg!("Game started at timestamp: {}", clock.unix_timestamp);
        Ok(())
    }

    /// Pause/unpause the game (admin only)
    pub fn toggle_pause(ctx: Context<AdminAction>, paused: bool) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.paused = paused;

        msg!("Game paused: {}", paused);
        Ok(())
    }

    /// Toggle hero minting (admin only)
    pub fn toggle_minting(ctx: Context<AdminAction>, enabled: bool) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.minting_enabled = enabled;

        msg!("Hero minting enabled: {}", enabled);
        Ok(())
    }

    /// Toggle house upgrades (admin only)
    pub fn toggle_house_upgrades(ctx: Context<AdminAction>, enabled: bool) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.house_upgrades_enabled = enabled;

        msg!("House upgrades enabled: {}", enabled);
        Ok(())
    }

    /// Withdraw SPL tokens from contract PDA to treasury (admin only)
    pub fn withdraw_token_funds(
        ctx: Context<WithdrawTokenFunds>,
        amount: u64,
    ) -> Result<()> {
        let global_state = &ctx.accounts.global_state;

        // Transfer tokens from program PDA to treasury
        let seeds = &[
            b"global_state".as_ref(),
            &[global_state.bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.program_token_account.to_account_info(),
                    to: ctx.accounts.treasury_token_account.to_account_info(),
                    authority: ctx.accounts.global_state.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        msg!("Withdrawn {} tokens to treasury", amount);
        Ok(())
    }

    // ========================================================================
    // USER FUNCTIONS
    // ========================================================================

    /// Purchase initial house (entry fee with dynamic SOL price)
    pub fn purchase_initial_house(ctx: Context<PurchaseInitialHouse>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let user_account = &mut ctx.accounts.user_account;

        require!(global_state.game_has_started, GameError::GameNotStarted);
        require!(!global_state.paused, GameError::GamePaused);

        // Transfer dynamic SOL price to dev treasury
        let entry_fee = global_state.initial_house_price;
        let ix = anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.dev_treasury.key(),
            entry_fee,
        );
        anchor_lang::solana_program::program::invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.dev_treasury.to_account_info(),
            ],
        )?;

        // Initialize user account with grid system
        user_account.owner = ctx.accounts.user.key();
        user_account.initialized_starter_house = true;
        user_account.house_level = 1;
        user_account.last_house_upgrade_timestamp = 0;

        // Initialize 4x4 grid for level 1
        let grid_dims = GridDimensions::for_level(1);
        user_account.grid_width = grid_dims.width;
        user_account.grid_height = grid_dims.height;
        user_account.house_occupied_coords = Vec::new();

        // Initialize vectors
        user_account.inventory = Vec::new();
        user_account.active_map = Vec::new();

        // Economy
        user_account.coin_balance = 0;
        user_account.player_power = 0;
        user_account.player_pending_rewards = 0;
        user_account.last_reward_block = 0;
        user_account.reward_debt = 0;

        // Referral
        user_account.referrer = None;
        user_account.referral_bonus_paid = 0;
        user_account.referrals = Vec::new();

        user_account.bump = ctx.bumps.user_account;

        // Increment house count
        global_state.house_count += 1;

        msg!("House purchased for {} lamports, initialized with 4x4 grid", entry_fee);
        Ok(())
    }

    /// Set referrer for a user (can only be set once)
    pub fn set_referrer(ctx: Context<SetReferrer>, referrer_pubkey: Pubkey) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;

        require!(user_account.referrer.is_none(), GameError::ReferrerAlreadySet);
        require!(referrer_pubkey != user_account.owner, GameError::CannotReferSelf);

        user_account.referrer = Some(referrer_pubkey);

        msg!("Referrer set to: {}", referrer_pubkey);
        Ok(())
    }

    /// Buy heroes in bulk (1-10 at once, costs 100 coins per hero, applies burn split)
    pub fn buy_hero(ctx: Context<BuyHero>, quantity: u8) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let user_account = &mut ctx.accounts.user_account;
        let clock = Clock::get()?;

        require!(!global_state.paused, GameError::GamePaused);
        require!(global_state.minting_enabled, GameError::MintingDisabled);
        require!(quantity >= 1 && quantity <= 10, GameError::InvalidHeroQuantity);

        // Calculate total cost (100 coins per hero)
        let total_cost = (quantity as u64) * 100;
        require!(user_account.coin_balance >= total_cost, GameError::InsufficientCoins);

        // Deduct coins
        user_account.coin_balance -= total_cost;

        // Apply burn split using dynamic burn_pct
        let (burn_amount, treasury_amount) = calculate_burn_split(total_cost, global_state.burn_pct);
        global_state.total_burned += burn_amount;
        global_state.reward_pool += treasury_amount;

        // Mint heroes
        for _i in 0..quantity {
            let hero_id = user_account.inventory.len() as u16;
            let hero = generate_hero(
                hero_id,
                clock.unix_timestamp,
                clock.slot,
                user_account.owner,
                global_state.unique_heroes_count,
            )?;

            msg!(
                "Minted hero #{}: {:?} skin #{}, Power: {}, Speed: {}, HP: {}, HMP: {:.2}",
                hero_id,
                hero.rarity,
                hero.skin_id,
                hero.power,
                hero.speed,
                hero.hp,
                hero.calculate_hmp()
            );

            user_account.inventory.push(hero);
            global_state.unique_heroes_count += 1;
        }

        msg!(
            "Bought {} heroes for {} coins (burn: {}, treasury: {})",
            quantity,
            total_cost,
            burn_amount,
            treasury_amount
        );

        Ok(())
    }

    /// Place hero on grid at specific coordinates with optional restroom flag
    pub fn place_hero_on_grid(
        ctx: Context<ModifyGrid>,
        hero_index: u16,
        x: u8,
        y: u8,
        is_restroom: bool,
    ) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        let clock = Clock::get()?;

        // Validate hero exists
        require!(
            (hero_index as usize) < user_account.inventory.len(),
            GameError::InvalidHeroIndex
        );

        // Validate coordinates
        require!(
            user_account.is_valid_coord(x, y),
            GameError::InvalidGridCoordinates
        );

        // Validate position is not occupied
        require!(
            !user_account.is_coord_occupied(x, y),
            GameError::GridPositionOccupied
        );

        // Check if hero is already on grid
        require!(
            user_account.find_hero_on_grid(hero_index).is_none(),
            GameError::HeroAlreadyOnMap
        );

        // Remove from map if present
        if let Some(pos) = user_account.active_map.iter().position(|&x| x == hero_index) {
            user_account.active_map.remove(pos);
        }

        // Validate restroom capacity
        if is_restroom {
            let max_restroom = user_account.get_max_restroom_slots();
            let current_restroom = user_account.count_restroom_slots();
            require!(current_restroom < max_restroom, GameError::RestroomFull);
        }

        // Place hero on grid
        let tile = HouseTile {
            x,
            y,
            hero_id: hero_index,
            is_restroom,
        };
        user_account.house_occupied_coords.push(tile);

        // Update hero timestamp
        let hero = &mut user_account.inventory[hero_index as usize];
        hero.last_action_time = clock.unix_timestamp;

        msg!(
            "Hero {} placed on grid at ({}, {}) {}",
            hero_index,
            x,
            y,
            if is_restroom { "(Restroom)" } else { "(Bench)" }
        );

        Ok(())
    }

    /// Remove hero from grid at specific coordinates
    pub fn remove_hero_from_grid(ctx: Context<ModifyGrid>, x: u8, y: u8) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;

        // Validate coordinates
        require!(
            user_account.is_valid_coord(x, y),
            GameError::InvalidGridCoordinates
        );

        // Find and remove tile
        let tile_pos = user_account
            .house_occupied_coords
            .iter()
            .position(|tile| tile.x == x && tile.y == y && !tile.is_empty());

        require!(tile_pos.is_some(), GameError::GridPositionEmpty);

        let hero_id = user_account.house_occupied_coords[tile_pos.unwrap()].hero_id;
        user_account.house_occupied_coords.remove(tile_pos.unwrap());

        msg!("Hero {} removed from grid at ({}, {})", hero_id, x, y);

        Ok(())
    }

    /// Move hero from grid to map (start mining)
    pub fn move_hero_to_map(ctx: Context<MoveHeroToMap>, hero_index: u16) -> Result<()> {
        let global_state = &ctx.accounts.global_state;
        let user_account = &mut ctx.accounts.user_account;
        let clock = Clock::get()?;

        require!(!global_state.paused, GameError::GamePaused);

        // Validate hero exists
        require!(
            (hero_index as usize) < user_account.inventory.len(),
            GameError::InvalidHeroIndex
        );

        // Check map capacity
        require!(user_account.active_map.len() < 15, GameError::MapFull);

        // Hero must be on grid or in inventory (not already on map)
        require!(
            !user_account.active_map.contains(&hero_index),
            GameError::HeroAlreadyOnMap
        );

        // Check hero HP
        require!(!user_account.inventory[hero_index as usize].is_sleeping(), GameError::HeroIsSleeping);

        // Remove from grid if present
        if let Some(pos) = user_account
            .house_occupied_coords
            .iter()
            .position(|tile| tile.hero_id == hero_index)
        {
            user_account.house_occupied_coords.remove(pos);
        }

        // Set mining start time
        user_account.inventory[hero_index as usize].last_action_time = clock.unix_timestamp;

        // Add to map
        user_account.active_map.push(hero_index);

        // Update player power (recalculate total HMP)
        user_account.player_power = user_account
            .active_map
            .iter()
            .filter_map(|&idx| user_account.inventory.get(idx as usize))
            .filter(|h| h.is_active())
            .map(|h| h.calculate_hmp() as u64)
            .sum();

        msg!("Hero {} moved to map, player power: {}", hero_index, user_account.player_power);

        Ok(())
    }

    /// Bulk place heroes on grid (multiple heroes in single transaction)
    pub fn bulk_place_heroes(
        ctx: Context<ModifyGrid>,
        placements: Vec<HeroPlacement>,
    ) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        let clock = Clock::get()?;

        // Pre-validate all placements before making any changes
        for placement in &placements {
            // Validate hero exists
            require!(
                (placement.hero_index as usize) < user_account.inventory.len(),
                GameError::InvalidHeroIndex
            );

            // Validate coordinates
            require!(
                user_account.is_valid_coord(placement.x, placement.y),
                GameError::InvalidGridCoordinates
            );

            // Validate position is not occupied (including by other heroes in this batch)
            require!(
                !user_account.is_coord_occupied(placement.x, placement.y),
                GameError::GridPositionOccupied
            );

            // Check if hero is already on grid
            require!(
                user_account.find_hero_on_grid(placement.hero_index).is_none(),
                GameError::HeroAlreadyOnMap
            );
        }

        // Validate total restroom capacity
        let current_restroom = user_account.count_restroom_slots();
        let new_restroom = placements.iter().filter(|p| p.is_restroom).count();
        let max_restroom = user_account.get_max_restroom_slots();
        require!(
            current_restroom + new_restroom <= max_restroom,
            GameError::RestroomFull
        );

        // All validations passed - now apply all placements
        for placement in placements {
            // Remove from map if present
            if let Some(pos) = user_account
                .active_map
                .iter()
                .position(|&x| x == placement.hero_index)
            {
                user_account.active_map.remove(pos);
            }

            // Place hero on grid
            let tile = HouseTile {
                x: placement.x,
                y: placement.y,
                hero_id: placement.hero_index,
                is_restroom: placement.is_restroom,
            };
            user_account.house_occupied_coords.push(tile);

            // Update hero timestamp
            let hero = &mut user_account.inventory[placement.hero_index as usize];
            hero.last_action_time = clock.unix_timestamp;

            msg!(
                "Hero {} placed on grid at ({}, {}) {}",
                placement.hero_index,
                placement.x,
                placement.y,
                if placement.is_restroom {
                    "(Restroom)"
                } else {
                    "(Bench)"
                }
            );
        }

        Ok(())
    }

    /// Bulk move heroes to map (multiple heroes in single transaction)
    pub fn bulk_move_to_map(
        ctx: Context<MoveHeroToMap>,
        hero_indices: Vec<u16>,
    ) -> Result<()> {
        let global_state = &ctx.accounts.global_state;
        let user_account = &mut ctx.accounts.user_account;
        let clock = Clock::get()?;

        require!(!global_state.paused, GameError::GamePaused);

        // Pre-validate all heroes before making any changes
        for &hero_index in &hero_indices {
            // Validate hero exists
            require!(
                (hero_index as usize) < user_account.inventory.len(),
                GameError::InvalidHeroIndex
            );

            // Hero must not already be on map
            require!(
                !user_account.active_map.contains(&hero_index),
                GameError::HeroAlreadyOnMap
            );

            // Check hero HP
            require!(
                !user_account.inventory[hero_index as usize].is_sleeping(),
                GameError::HeroIsSleeping
            );
        }

        // Check map capacity
        let new_map_size = user_account.active_map.len() + hero_indices.len();
        require!(new_map_size <= 15, GameError::MapFull);

        // All validations passed - now move all heroes
        for hero_index in hero_indices {
            // Remove from grid if present
            if let Some(pos) = user_account
                .house_occupied_coords
                .iter()
                .position(|tile| tile.hero_id == hero_index)
            {
                user_account.house_occupied_coords.remove(pos);
            }

            // Set mining start time
            user_account.inventory[hero_index as usize].last_action_time = clock.unix_timestamp;

            // Add to map
            user_account.active_map.push(hero_index);

            msg!("Hero {} moved to map", hero_index);
        }

        // Update player power once at the end (efficient)
        user_account.player_power = user_account
            .active_map
            .iter()
            .filter_map(|&idx| user_account.inventory.get(idx as usize))
            .filter(|h| h.is_active())
            .map(|h| h.calculate_hmp() as u64)
            .sum();

        msg!(
            "Bulk moved {} heroes to map, player power: {}",
            user_account.active_map.len(),
            user_account.player_power
        );

        Ok(())
    }

    /// Claim mining rewards with time-based calculation and referral bonuses
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let clock = Clock::get()?;

        // Early validations
        require!(!ctx.accounts.global_state.paused, GameError::GamePaused);
        require!(!ctx.accounts.user_account.active_map.is_empty(), GameError::NoHeroesOnMap);

        let current_time = clock.unix_timestamp;
        let mut total_hmp: u64 = 0;
        let mut earliest_time = current_time;

        // Calculate total HMP and apply HP drain
        let active_map_copy = ctx.accounts.user_account.active_map.clone();
        for hero_index in active_map_copy {
            let hero = &mut ctx.accounts.user_account.inventory[hero_index as usize];

            if hero.is_sleeping() {
                continue;
            }

            let elapsed = (current_time - hero.last_action_time) as u64;

            // Calculate HP drain (Speed-based)
            let hp_drain = hero.calculate_hp_drain(elapsed);
            hero.hp = hero.hp.saturating_sub(hp_drain);

            // Track earliest action time
            if hero.last_action_time < earliest_time {
                earliest_time = hero.last_action_time;
            }

            // Add to total HMP if still alive
            if hero.is_active() {
                total_hmp += hero.calculate_hmp() as u64;
            }

            hero.last_action_time = current_time;
        }

        require!(total_hmp > 0, GameError::NoActiveHeroes);

        // Calculate elapsed time
        let elapsed_seconds = (current_time - earliest_time) as u64;

        // Get current reward rate with halving
        let bombcoin_per_block = ctx.accounts.global_state.get_bombcoin_per_block();

        // Calculate gross reward using utility function
        let gross_reward = calculate_mining_reward(
            elapsed_seconds,
            total_hmp,
            bombcoin_per_block,
            ctx.accounts.global_state.rewards_precision,
        );

        require!(gross_reward > 0, GameError::NoRewardsToClaim);

        // Calculate referral bonus using dynamic referral_fee
        let referral_bonus = calculate_referral_bonus(gross_reward, ctx.accounts.global_state.referral_fee);
        let net_reward = gross_reward.saturating_sub(referral_bonus);

        // Handle referral bonus (mint to referrer if exists)
        let referrer = ctx.accounts.user_account.referrer;
        let global_state_bump = ctx.accounts.global_state.bump;

        if let Some(referrer_pubkey) = referrer {
            if referral_bonus > 0 {
                let seeds = &[b"global_state".as_ref(), &[global_state_bump]];
                let signer = &[&seeds[..]];

                token::mint_to(
                    CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        MintTo {
                            mint: ctx.accounts.reward_token_mint.to_account_info(),
                            to: ctx.accounts.referrer_token_account.to_account_info(),
                            authority: ctx.accounts.global_state.to_account_info(),
                        },
                        signer,
                    ),
                    referral_bonus,
                )?;

                msg!("Referral bonus: {} tokens to {}", referral_bonus, referrer_pubkey);
            }
        }

        // Mint net reward to user
        if net_reward > 0 {
            let seeds = &[b"global_state".as_ref(), &[global_state_bump]];
            let signer = &[&seeds[..]];

            token::mint_to(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    MintTo {
                        mint: ctx.accounts.reward_token_mint.to_account_info(),
                        to: ctx.accounts.user_token_account.to_account_info(),
                        authority: ctx.accounts.global_state.to_account_info(),
                    },
                    signer,
                ),
                net_reward,
            )?;
        }

        // Update global supply counter
        ctx.accounts.global_state.total_mined += gross_reward;

        // Add coins to internal balance for hero minting
        ctx.accounts.user_account.coin_balance += net_reward;

        // Update player power
        ctx.accounts.user_account.player_power = total_hmp;

        msg!(
            "Claimed {} coins (net: {}, referral: {}), HMP: {}, Elapsed: {}s",
            gross_reward,
            net_reward,
            referral_bonus,
            total_hmp,
            elapsed_seconds
        );

        Ok(())
    }

    /// Recover HP for heroes on grid (location-based multipliers: bench 1x, restroom 3x)
    pub fn recover_hp(ctx: Context<RecoverHP>) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        let house_occupied_copy = user_account.house_occupied_coords.clone();

        for tile in house_occupied_copy {
            if tile.is_empty() {
                continue;
            }

            let hero_index = tile.hero_id;
            let hero = &mut user_account.inventory[hero_index as usize];
            let elapsed_seconds = (current_time - hero.last_action_time) as u64;

            if elapsed_seconds > 0 {
                let location_multiplier = if tile.is_restroom { 3.0 } else { 1.0 };

                let recovery = hero.calculate_hp_recovery(elapsed_seconds, location_multiplier);
                hero.hp = hero.hp.saturating_add(recovery).min(hero.max_hp);
                hero.last_action_time = current_time;

                msg!(
                    "Hero {} recovered {} HP ({}x multiplier)",
                    hero_index,
                    recovery,
                    location_multiplier
                );
            }
        }

        Ok(())
    }

    /// Upgrade house to next level (expands grid, costs coins, has cooldown)
    pub fn upgrade_house(ctx: Context<UpgradeHouse>) -> Result<()> {
        let global_state = &ctx.accounts.global_state;
        let user_account = &mut ctx.accounts.user_account;
        let clock = Clock::get()?;

        require!(!global_state.paused, GameError::GamePaused);
        require!(global_state.house_upgrades_enabled, GameError::HouseUpgradesDisabled);
        require!(user_account.house_level < 6, GameError::MaxHouseLevelReached);

        // Check cooldown
        if user_account.last_house_upgrade_timestamp > 0 {
            let cooldown = user_account.get_upgrade_cooldown();
            let time_since_upgrade =
                clock.unix_timestamp - user_account.last_house_upgrade_timestamp;
            require!(time_since_upgrade >= cooldown, GameError::UpgradeCooldownActive);
        }

        // Check cost
        let cost = user_account.get_upgrade_cost();
        require!(user_account.coin_balance >= cost, GameError::InsufficientCoins);

        // Deduct coins
        user_account.coin_balance -= cost;

        // Upgrade house
        user_account.house_level += 1;
        user_account.last_house_upgrade_timestamp = clock.unix_timestamp;

        // Expand grid
        let new_dims = GridDimensions::for_level(user_account.house_level);
        user_account.grid_width = new_dims.width;
        user_account.grid_height = new_dims.height;

        msg!(
            "House upgraded to level {} ({}x{} grid) for {} coins",
            user_account.house_level,
            new_dims.width,
            new_dims.height,
            cost
        );

        Ok(())
    }

    // ========================================================================
    // READ-ONLY VIEW FUNCTIONS (For Frontend)
    // ========================================================================

    /// Calculate pending rewards without claiming (read-only simulation)
    pub fn pending_rewards(ctx: Context<ViewUserAccount>) -> Result<PendingRewardsData> {
        let global_state = &ctx.accounts.global_state;
        let user_account = &ctx.accounts.user_account;
        let clock = Clock::get()?;

        let current_time = clock.unix_timestamp;
        let mut total_hmp: u64 = 0;
        let mut earliest_time = current_time;
        let mut active_hero_count = 0;

        // Calculate total HMP (without mutating)
        for &hero_index in &user_account.active_map {
            if let Some(hero) = user_account.inventory.get(hero_index as usize) {
                if hero.is_active() {
                    total_hmp += hero.calculate_hmp() as u64;
                    active_hero_count += 1;

                    if hero.last_action_time < earliest_time {
                        earliest_time = hero.last_action_time;
                    }
                }
            }
        }

        if total_hmp == 0 {
            return Ok(PendingRewardsData {
                gross_reward: 0,
                net_reward: 0,
                referral_bonus: 0,
                total_hmp,
                active_hero_count,
                elapsed_seconds: 0,
                current_bombcoin_per_block: global_state.get_bombcoin_per_block(),
            });
        }

        // Calculate elapsed time
        let elapsed_seconds = (current_time - earliest_time) as u64;

        // Get current reward rate
        let bombcoin_per_block = global_state.get_bombcoin_per_block();

        // Calculate gross reward
        let gross_reward = calculate_mining_reward(
            elapsed_seconds,
            total_hmp,
            bombcoin_per_block,
            global_state.rewards_precision,
        );

        // Calculate referral split
        let referral_bonus = calculate_referral_bonus(gross_reward, global_state.referral_fee);
        let net_reward = gross_reward.saturating_sub(referral_bonus);

        Ok(PendingRewardsData {
            gross_reward,
            net_reward,
            referral_bonus,
            total_hmp,
            active_hero_count,
            elapsed_seconds,
            current_bombcoin_per_block: bombcoin_per_block,
        })
    }

    /// Get comprehensive player stats
    pub fn get_player_stats(ctx: Context<ViewUserAccount>) -> Result<PlayerStatsData> {
        let user_account = &ctx.accounts.user_account;
        let clock = Clock::get()?;

        // Count heroes by location
        let mut heroes_on_map = 0;
        let mut heroes_on_grid = 0;
        let mut heroes_in_restroom = 0;
        let heroes_in_inventory = user_account.inventory.len();
        let mut heroes_sleeping = 0;

        for (idx, hero) in user_account.inventory.iter().enumerate() {
            if hero.is_sleeping() {
                heroes_sleeping += 1;
            }

            if user_account.active_map.contains(&(idx as u16)) {
                heroes_on_map += 1;
            }
        }

        for tile in &user_account.house_occupied_coords {
            if !tile.is_empty() {
                heroes_on_grid += 1;
                if tile.is_restroom {
                    heroes_in_restroom += 1;
                }
            }
        }

        // House upgrade info
        let next_upgrade_cost = user_account.get_upgrade_cost();
        let upgrade_cooldown_remaining = if user_account.last_house_upgrade_timestamp > 0 {
            let cooldown = user_account.get_upgrade_cooldown();
            let elapsed = clock.unix_timestamp - user_account.last_house_upgrade_timestamp;
            cooldown.saturating_sub(elapsed)
        } else {
            0
        };

        // Grid info
        let max_restroom_slots = user_account.get_max_restroom_slots();
        let restroom_slots_used = user_account.count_restroom_slots();

        Ok(PlayerStatsData {
            owner: user_account.owner,
            house_level: user_account.house_level,
            grid_width: user_account.grid_width,
            grid_height: user_account.grid_height,
            coin_balance: user_account.coin_balance,
            player_power: user_account.player_power,
            heroes_total: heroes_in_inventory as u64,
            heroes_on_map: heroes_on_map as u64,
            heroes_on_grid: heroes_on_grid as u64,
            heroes_in_restroom: heroes_in_restroom as u64,
            heroes_sleeping: heroes_sleeping as u64,
            max_restroom_slots: max_restroom_slots as u64,
            restroom_slots_used: restroom_slots_used as u64,
            next_upgrade_cost,
            upgrade_cooldown_remaining,
            can_upgrade: user_account.house_level < 6 && upgrade_cooldown_remaining == 0,
            referrer: user_account.referrer,
            referral_bonus_paid: user_account.referral_bonus_paid,
            referral_count: user_account.referrals.len() as u64,
        })
    }

    /// Get detailed hero info by index
    pub fn get_hero_details(
        ctx: Context<ViewUserAccount>,
        hero_index: u16,
    ) -> Result<HeroDetailsData> {
        let user_account = &ctx.accounts.user_account;
        let clock = Clock::get()?;

        require!(
            (hero_index as usize) < user_account.inventory.len(),
            GameError::InvalidHeroIndex
        );

        let hero = &user_account.inventory[hero_index as usize];

        // Find hero location
        let is_on_map = user_account.active_map.contains(&hero_index);
        let grid_tile = user_account.find_hero_on_grid(hero_index);

        let (grid_x, grid_y, is_in_restroom) = if let Some(tile) = grid_tile {
            (Some(tile.x), Some(tile.y), tile.is_restroom)
        } else {
            (None, None, false)
        };

        // Calculate time-based stats
        let elapsed_since_action = (clock.unix_timestamp - hero.last_action_time) as u64;

        let estimated_hp_drain = if is_on_map {
            hero.calculate_hp_drain(elapsed_since_action)
        } else {
            0
        };

        let estimated_hp_recovery = if grid_tile.is_some() && !is_on_map {
            let multiplier = if is_in_restroom { 3.0 } else { 1.0 };
            hero.calculate_hp_recovery(elapsed_since_action, multiplier)
        } else {
            0
        };

        let estimated_current_hp = if is_on_map {
            hero.hp.saturating_sub(estimated_hp_drain)
        } else if grid_tile.is_some() {
            hero.hp.saturating_add(estimated_hp_recovery).min(hero.max_hp)
        } else {
            hero.hp
        };

        Ok(HeroDetailsData {
            id: hero.id,
            skin_id: hero.skin_id,
            rarity: hero.rarity,
            power: hero.power,
            speed: hero.speed,
            stamina: hero.stamina,
            max_stamina: hero.max_stamina,
            bomb_number: hero.bomb_number,
            bomb_range: hero.bomb_range,
            hp: hero.hp,
            max_hp: hero.max_hp,
            estimated_current_hp,
            hmp: hero.calculate_hmp() as u64,
            is_sleeping: hero.is_sleeping(),
            is_on_map,
            is_on_grid: grid_tile.is_some(),
            grid_x,
            grid_y,
            is_in_restroom,
            last_action_time: hero.last_action_time,
            elapsed_since_action,
        })
    }

    /// Get grid state with all tiles
    pub fn get_grid_state(ctx: Context<ViewUserAccount>) -> Result<GridStateData> {
        let user_account = &ctx.accounts.user_account;

        let tiles: Vec<GridTileData> = user_account
            .house_occupied_coords
            .iter()
            .map(|tile| GridTileData {
                x: tile.x,
                y: tile.y,
                hero_id: if tile.is_empty() {
                    None
                } else {
                    Some(tile.hero_id)
                },
                is_restroom: tile.is_restroom,
                is_empty: tile.is_empty(),
            })
            .collect();

        Ok(GridStateData {
            grid_width: user_account.grid_width,
            grid_height: user_account.grid_height,
            house_level: user_account.house_level,
            occupied_tiles: tiles,
            total_tiles: (user_account.grid_width as u64) * (user_account.grid_height as u64),
            tiles_occupied: user_account
                .house_occupied_coords
                .iter()
                .filter(|t| !t.is_empty())
                .count() as u64,
        })
    }

    /// Get global game info
    pub fn get_game_info(ctx: Context<ViewGlobalState>) -> Result<GameInfoData> {
        let global_state = &ctx.accounts.global_state;

        Ok(GameInfoData {
            authority: global_state.authority,
            dev_treasury: global_state.dev_treasury,
            reward_token_mint: global_state.reward_token_mint,
            game_has_started: global_state.game_has_started,
            paused: global_state.paused,
            start_block: global_state.start_block,
            house_count: global_state.house_count,
            unique_heroes_count: global_state.unique_heroes_count,
            total_hash_power: global_state.total_hash_power,
            initial_house_price: global_state.initial_house_price,
            initial_bombcoin_per_block: global_state.initial_bombcoin_per_block,
            current_bombcoin_per_block: global_state.get_bombcoin_per_block(),
            halving_interval: global_state.halving_interval,
            burn_pct: global_state.burn_pct,
            referral_fee: global_state.referral_fee,
            rewards_precision: global_state.rewards_precision,
            total_mined: global_state.total_mined,
            total_burned: global_state.total_burned,
            reward_pool: global_state.reward_pool,
            blocks_until_next_halving: global_state.blocks_until_next_halving(),
        })
    }
}

// ============================================================================
// ACCOUNT CONTEXTS
// ============================================================================

#[derive(Accounts)]
pub struct InitializeGlobalState<'info> {
    #[account(
        init,
        payer = authority,
        space = GlobalState::LEN,
        seeds = [b"global_state"],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = global_state,
        seeds = [b"reward_token_mint"],
        bump
    )]
    pub reward_token_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct PurchaseInitialHouse<'info> {
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        init,
        payer = user,
        space = UserAccount::MAX_LEN,
        seeds = [b"user_account", user.key().as_ref()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    /// CHECK: Dev treasury receiving SOL
    pub dev_treasury: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetReferrer<'info> {
    #[account(
        mut,
        seeds = [b"user_account", user.key().as_ref()],
        bump = user_account.bump,
        has_one = owner
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub owner: SystemAccount<'info>,
}

#[derive(Accounts)]
pub struct BuyHero<'info> {
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        mut,
        seeds = [b"user_account", user.key().as_ref()],
        bump = user_account.bump,
        has_one = owner
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub owner: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ModifyGrid<'info> {
    #[account(
        mut,
        seeds = [b"user_account", user.key().as_ref()],
        bump = user_account.bump,
        has_one = owner
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub owner: SystemAccount<'info>,
}

#[derive(Accounts)]
pub struct MoveHeroToMap<'info> {
    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        mut,
        seeds = [b"user_account", user.key().as_ref()],
        bump = user_account.bump,
        has_one = owner
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub owner: SystemAccount<'info>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        mut,
        seeds = [b"reward_token_mint"],
        bump
    )]
    pub reward_token_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"user_account", user.key().as_ref()],
        bump = user_account.bump,
        has_one = owner
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(
        mut,
        constraint = user_token_account.mint == reward_token_mint.key(),
        constraint = user_token_account.owner == user.key()
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = referrer_token_account.mint == reward_token_mint.key()
    )]
    pub referrer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub owner: SystemAccount<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RecoverHP<'info> {
    #[account(
        mut,
        seeds = [b"user_account", user.key().as_ref()],
        bump = user_account.bump,
        has_one = owner
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub owner: SystemAccount<'info>,
}

#[derive(Accounts)]
pub struct UpgradeHouse<'info> {
    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        mut,
        seeds = [b"user_account", user.key().as_ref()],
        bump = user_account.bump,
        has_one = owner
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub owner: SystemAccount<'info>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(
        mut,
        seeds = [b"global_state"],
        bump = global_state.bump,
        has_one = authority
    )]
    pub global_state: Account<'info, GlobalState>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawTokenFunds<'info> {
    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump,
        has_one = authority
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(mut)]
    pub program_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ViewUserAccount<'info> {
    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,

    #[account(
        seeds = [b"user_account", user_account.owner.as_ref()],
        bump = user_account.bump
    )]
    pub user_account: Account<'info, UserAccount>,
}

#[derive(Accounts)]
pub struct ViewGlobalState<'info> {
    #[account(
        seeds = [b"global_state"],
        bump = global_state.bump
    )]
    pub global_state: Account<'info, GlobalState>,
}

// ============================================================================
// VIEW FUNCTION RETURN DATA STRUCTURES
// ============================================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct HeroPlacement {
    pub hero_index: u16,
    pub x: u8,
    pub y: u8,
    pub is_restroom: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct PendingRewardsData {
    pub gross_reward: u64,
    pub net_reward: u64,
    pub referral_bonus: u64,
    pub total_hmp: u64,
    pub active_hero_count: u16,
    pub elapsed_seconds: u64,
    pub current_bombcoin_per_block: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct PlayerStatsData {
    pub owner: Pubkey,
    pub house_level: u8,
    pub grid_width: u8,
    pub grid_height: u8,
    pub coin_balance: u64,
    pub player_power: u64,
    pub heroes_total: u64,
    pub heroes_on_map: u64,
    pub heroes_on_grid: u64,
    pub heroes_in_restroom: u64,
    pub heroes_sleeping: u64,
    pub max_restroom_slots: u64,
    pub restroom_slots_used: u64,
    pub next_upgrade_cost: u64,
    pub upgrade_cooldown_remaining: i64,
    pub can_upgrade: bool,
    pub referrer: Option<Pubkey>,
    pub referral_bonus_paid: u64,
    pub referral_count: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct HeroDetailsData {
    pub id: u16,
    pub skin_id: u8,
    pub rarity: HeroRarity,
    pub power: u32,
    pub speed: u32,
    pub stamina: u32,
    pub max_stamina: u32,
    pub bomb_number: u8,
    pub bomb_range: u8,
    pub hp: u32,
    pub max_hp: u32,
    pub estimated_current_hp: u32,
    pub hmp: u64,
    pub is_sleeping: bool,
    pub is_on_map: bool,
    pub is_on_grid: bool,
    pub grid_x: Option<u8>,
    pub grid_y: Option<u8>,
    pub is_in_restroom: bool,
    pub last_action_time: i64,
    pub elapsed_since_action: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct GridTileData {
    pub x: u8,
    pub y: u8,
    pub hero_id: Option<u16>,
    pub is_restroom: bool,
    pub is_empty: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct GridStateData {
    pub grid_width: u8,
    pub grid_height: u8,
    pub house_level: u8,
    pub occupied_tiles: Vec<GridTileData>,
    pub total_tiles: u64,
    pub tiles_occupied: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct GameInfoData {
    pub authority: Pubkey,
    pub dev_treasury: Pubkey,
    pub reward_token_mint: Pubkey,
    pub game_has_started: bool,
    pub paused: bool,
    pub start_block: i64,
    pub house_count: u64,
    pub unique_heroes_count: u64,
    pub total_hash_power: u64,
    pub initial_house_price: u64,
    pub initial_bombcoin_per_block: u64,
    pub current_bombcoin_per_block: u64,
    pub halving_interval: u64,
    pub burn_pct: u16,
    pub referral_fee: u16,
    pub rewards_precision: u64,
    pub total_mined: u64,
    pub total_burned: u64,
    pub reward_pool: u64,
    pub blocks_until_next_halving: u64,
}
