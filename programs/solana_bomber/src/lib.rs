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

    /// Initialize the global game state (admin only, one-time)
    pub fn initialize_global_state(
        ctx: Context<InitializeGlobalState>,
        dev_treasury: Pubkey,
    ) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;

        global_state.authority = ctx.accounts.authority.key();
        global_state.reward_token_mint = ctx.accounts.reward_token_mint.key();
        global_state.total_mined = 0;
        global_state.total_burned = 0;
        global_state.reward_pool = 0;
        global_state.dev_treasury = dev_treasury;
        global_state.paused = false;
        global_state.total_heroes_minted = 0;
        global_state.bump = ctx.bumps.global_state;

        msg!("Global state initialized");
        Ok(())
    }

    /// Initialize a new user account (pay 0.25 SOL entry fee)
    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;

        // Transfer 0.25 SOL to dev treasury
        let entry_fee = 250_000_000; // 0.25 SOL in lamports
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

        // Initialize user account
        user_account.owner = ctx.accounts.user.key();
        user_account.house_level = 1;
        user_account.house_upgrade_start = 0;
        user_account.coin_balance = 0;
        user_account.referrer = None;
        user_account.inventory = Vec::new();
        user_account.active_house = Vec::new();
        user_account.active_map = Vec::new();
        user_account.restroom_slots = Vec::new();
        user_account.bump = ctx.bumps.user_account;

        msg!("User initialized with house level 1");
        Ok(())
    }

    /// Set referrer for a user (can only be set once)
    pub fn set_referrer(ctx: Context<SetReferrer>, referrer: Pubkey) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;

        require!(user_account.referrer.is_none(), GameError::ReferrerAlreadySet);
        require!(referrer != user_account.owner, GameError::CannotReferSelf);

        user_account.referrer = Some(referrer);

        msg!("Referrer set to: {}", referrer);
        Ok(())
    }

    /// Mint a new hero (costs 100 coins, random rarity)
    pub fn mint_hero(ctx: Context<MintHero>) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        let user_account = &mut ctx.accounts.user_account;

        require!(!global_state.paused, GameError::GamePaused);
        require!(user_account.coin_balance >= 100, GameError::InsufficientCoins);

        // Deduct 100 coins
        user_account.coin_balance -= 100;

        // 50% burn, 50% to reward pool
        global_state.total_burned += 50;
        global_state.reward_pool += 50;

        // Generate random hero
        let clock = Clock::get()?;
        let hero = generate_hero(
            user_account.inventory.len() as u16,
            clock.unix_timestamp,
            clock.slot,
            user_account.owner,
        )?;

        msg!("Minted {:?} hero with Power: {}, Speed: {}, HMP: {}",
            hero.rarity, hero.power, hero.speed, hero.calculate_hmp());

        user_account.inventory.push(hero);
        global_state.total_heroes_minted += 1;

        Ok(())
    }

    /// Upgrade house to next level (costs coins, has cooldown)
    pub fn upgrade_house(ctx: Context<UpgradeHouse>) -> Result<()> {
        let global_state = &ctx.accounts.global_state;
        let user_account = &mut ctx.accounts.user_account;
        let clock = Clock::get()?;

        require!(!global_state.paused, GameError::GamePaused);
        require!(user_account.house_level < 6, GameError::MaxHouseLevelReached);

        // Check cooldown
        if user_account.house_upgrade_start > 0 {
            let cooldown = user_account.get_upgrade_cooldown();
            let time_since_upgrade = clock.unix_timestamp - user_account.house_upgrade_start;
            require!(time_since_upgrade >= cooldown, GameError::UpgradeCooldownActive);
        }

        // Check cost
        let cost = user_account.get_upgrade_cost();
        require!(user_account.coin_balance >= cost, GameError::InsufficientCoins);

        // Deduct coins
        user_account.coin_balance -= cost;

        // Upgrade
        user_account.house_level += 1;
        user_account.house_upgrade_start = clock.unix_timestamp;

        msg!("House upgraded to level {}", user_account.house_level);
        Ok(())
    }

    /// Move hero from inventory to house (max 21 in house)
    pub fn move_hero_to_house(ctx: Context<MoveHero>, hero_index: u16) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;

        require!((hero_index as usize) < user_account.inventory.len(), GameError::InvalidHeroIndex);
        require!(user_account.active_house.len() < 21, GameError::HouseFull);
        require!(!user_account.active_house.contains(&hero_index), GameError::HeroAlreadyInHouse);

        // Remove from map if present
        if let Some(pos) = user_account.active_map.iter().position(|&x| x == hero_index) {
            user_account.active_map.remove(pos);
        }

        user_account.active_house.push(hero_index);

        msg!("Hero {} moved to house", hero_index);
        Ok(())
    }

    /// Move hero from house to map (max 15 on map)
    pub fn move_hero_to_map(ctx: Context<MoveHero>, hero_index: u16) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        let clock = Clock::get()?;

        require!((hero_index as usize) < user_account.inventory.len(), GameError::InvalidHeroIndex);
        require!(user_account.active_map.len() < 15, GameError::MapFull);
        require!(user_account.active_house.contains(&hero_index), GameError::HeroNotInHouse);
        require!(!user_account.active_map.contains(&hero_index), GameError::HeroAlreadyOnMap);

        let hero = &mut user_account.inventory[hero_index as usize];
        require!(!hero.is_sleeping(), GameError::HeroIsSleeping);

        // Set mining start time
        hero.last_action_time = clock.unix_timestamp;

        // Remove from restroom if present
        if let Some(pos) = user_account.restroom_slots.iter().position(|&x| x == hero_index) {
            user_account.restroom_slots.remove(pos);
        }

        user_account.active_map.push(hero_index);

        msg!("Hero {} moved to map", hero_index);
        Ok(())
    }

    /// Move hero to restroom (boosted recovery, limited slots)
    pub fn move_hero_to_restroom(ctx: Context<MoveHero>, hero_index: u16) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        let clock = Clock::get()?;

        require!((hero_index as usize) < user_account.inventory.len(), GameError::InvalidHeroIndex);
        require!(user_account.active_house.contains(&hero_index), GameError::HeroNotInHouse);

        let restroom_capacity = user_account.get_restroom_capacity();
        require!(
            (user_account.restroom_slots.len() as u8) < restroom_capacity,
            GameError::RestroomFull
        );

        // Remove from map if present
        if let Some(pos) = user_account.active_map.iter().position(|&x| x == hero_index) {
            user_account.active_map.remove(pos);
        }

        if !user_account.restroom_slots.contains(&hero_index) {
            let hero = &mut user_account.inventory[hero_index as usize];
            hero.last_action_time = clock.unix_timestamp;
            user_account.restroom_slots.push(hero_index);
        }

        msg!("Hero {} moved to restroom", hero_index);
        Ok(())
    }

    /// Remove hero from house (back to inventory)
    pub fn remove_hero_from_house(ctx: Context<MoveHero>, hero_index: u16) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;

        // Remove from house
        if let Some(pos) = user_account.active_house.iter().position(|&x| x == hero_index) {
            user_account.active_house.remove(pos);
        }

        // Remove from map if present
        if let Some(pos) = user_account.active_map.iter().position(|&x| x == hero_index) {
            user_account.active_map.remove(pos);
        }

        // Remove from restroom if present
        if let Some(pos) = user_account.restroom_slots.iter().position(|&x| x == hero_index) {
            user_account.restroom_slots.remove(pos);
        }

        msg!("Hero {} removed from house", hero_index);
        Ok(())
    }

    /// Claim mining rewards (time-delta calculation, applies halving)
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let clock = Clock::get()?;

        require!(!ctx.accounts.global_state.paused, GameError::GamePaused);
        require!(!ctx.accounts.user_account.active_map.is_empty(), GameError::NoHeroesOnMap);

        let current_time = clock.unix_timestamp;
        let mut total_hmp: f64 = 0.0;
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
            if !hero.is_sleeping() {
                total_hmp += hero.calculate_hmp();
            }

            hero.last_action_time = current_time;
        }

        require!(total_hmp > 0.0, GameError::NoActiveHeroes);

        // Calculate rewards
        let elapsed_seconds = (current_time - earliest_time) as f64;
        let elapsed_hours = elapsed_seconds / 3600.0;

        let phase_rate = get_phase_rate(ctx.accounts.global_state.total_mined);
        let gross_reward = elapsed_hours * total_hmp * phase_rate;

        require!(gross_reward > 0.0, GameError::NoRewardsToClai);

        // Apply 2.5% claim tax
        let tax = gross_reward * 0.025;
        let net_reward = gross_reward - tax;

        // Prepare amounts
        let referral_lamports = (gross_reward * 0.025 * 1_000_000.0) as u64;
        let net_lamports = (net_reward * 1_000_000.0) as u64;
        let gross_lamports = (gross_reward * 1_000_000.0) as u64;

        // Handle referral (2.5% of gross) - do CPI first before modifying state
        let referrer = ctx.accounts.user_account.referrer;
        if let Some(referrer) = referrer {
            if referral_lamports > 0 {
                let seeds = &[
                    b"global_state".as_ref(),
                    &[ctx.accounts.global_state.bump],
                ];
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
                    referral_lamports,
                )?;

                msg!("Referral bonus: {} tokens to {}", referral_lamports, referrer);
            }
        }

        // Mint net reward to user (as SPL tokens)
        if net_lamports > 0 {
            let seeds = &[
                b"global_state".as_ref(),
                &[ctx.accounts.global_state.bump],
            ];
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
                net_lamports,
            )?;
        }

        // Update global supply counter (after all CPIs)
        ctx.accounts.global_state.total_mined += gross_lamports;

        // Also add coins to internal balance for hero minting
        ctx.accounts.user_account.coin_balance += net_lamports;

        msg!("Claimed {} coins (net), Total HMP: {}, Elapsed: {:.2}h",
            net_lamports, total_hmp, elapsed_hours);

        Ok(())
    }

    /// Recover HP for heroes in house (bench or restroom)
    pub fn recover_hp(ctx: Context<RecoverHP>) -> Result<()> {
        let user_account = &mut ctx.accounts.user_account;
        let clock = Clock::get()?;
        let current_time = clock.unix_timestamp;

        const RECOVERY_INTERVAL: u64 = 120; // 2 minutes

        // Clone to avoid borrow conflicts
        let active_house_copy = user_account.active_house.clone();
        let active_map_copy = user_account.active_map.clone();
        let restroom_slots_copy = user_account.restroom_slots.clone();
        let house_level = user_account.house_level;

        for hero_index in active_house_copy {
            // Skip heroes on map
            if active_map_copy.contains(&hero_index) {
                continue;
            }

            let hero = &mut user_account.inventory[hero_index as usize];
            let elapsed_seconds = (current_time - hero.last_action_time) as u64;

            // Calculate complete recovery ticks
            let ticks = elapsed_seconds / RECOVERY_INTERVAL;

            if ticks > 0 {
                let is_in_restroom = restroom_slots_copy.contains(&hero_index);

                let multiplier_bps = if is_in_restroom {
                    // Calculate multiplier based on house level
                    match house_level {
                        1 => 100,
                        2 => 200,
                        3 => 500,
                        4 => 800,
                        5 => 1100,
                        6 => 1400,
                        _ => 100,
                    }
                } else {
                    100 // Bench = 1.0x
                };

                // Base recovery = Stamina per tick
                let base_recovery = hero.stamina * ticks as u32;
                let total_recovery = (base_recovery as u64 * multiplier_bps as u64 / 100) as u32;

                hero.hp = hero.hp.saturating_add(total_recovery).min(hero.max_hp);
                hero.last_action_time = current_time;

                msg!("Hero {} recovered {} HP ({}x multiplier)",
                    hero_index, total_recovery, multiplier_bps as f64 / 100.0);
            }
        }

        Ok(())
    }

    /// Admin: Pause/unpause the game
    pub fn set_paused(ctx: Context<AdminAction>, paused: bool) -> Result<()> {
        let global_state = &mut ctx.accounts.global_state;
        global_state.paused = paused;

        msg!("Game paused: {}", paused);
        Ok(())
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
pub struct InitializeUser<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + UserAccount::BASE_LEN + (Hero::LEN * 100), // Pre-allocate for ~100 heroes
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
pub struct MintHero<'info> {
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
        has_one = owner,
        realloc = 8 + UserAccount::BASE_LEN + (user_account.inventory.len() + 1) * Hero::LEN + user_account.active_house.len() * 2 + user_account.active_map.len() * 2 + user_account.restroom_slots.len() * 2,
        realloc::payer = user,
        realloc::zero = false
    )]
    pub user_account: Account<'info, UserAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub owner: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
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
pub struct MoveHero<'info> {
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
