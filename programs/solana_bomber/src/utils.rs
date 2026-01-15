use anchor_lang::prelude::*;
use crate::state::*;

/// Generate a random hero with template-based skin and rarity-constrained stats
/// Uses timestamp + slot + user pubkey + hero count as pseudo-randomness source
pub fn generate_hero(
    id: u16,
    timestamp: i64,
    slot: u64,
    user_pubkey: Pubkey,
    global_hero_count: u64,
) -> Result<Hero> {
    // Create seed from multiple entropy sources
    let mut seed_data = Vec::new();
    seed_data.extend_from_slice(&timestamp.to_le_bytes());
    seed_data.extend_from_slice(&slot.to_le_bytes());
    seed_data.extend_from_slice(user_pubkey.as_ref());
    seed_data.extend_from_slice(&id.to_le_bytes());
    seed_data.extend_from_slice(&global_hero_count.to_le_bytes());

    // Use simple XOR hash for pseudo-random generation
    let mut seed_bytes = [0u8; 32];
    for (i, chunk) in seed_data.chunks(32).enumerate() {
        for (j, &byte) in chunk.iter().enumerate() {
            seed_bytes[j] ^= byte.wrapping_add((i as u8).wrapping_mul(17));
        }
    }

    // Roll for rarity (0-1000 for better precision)
    let rarity_roll = u16::from_le_bytes([seed_bytes[0], seed_bytes[1]]) % 1001;
    let rarity = HeroRarity::from_roll(rarity_roll);

    // Roll for skin template (1-9)
    let skin_id = (u8::from_le_bytes([seed_bytes[2]]) % 9) + 1;

    // Get rarity-constrained stat ranges
    let (stat_min, stat_max) = rarity.stat_range();
    let (bomb_min, bomb_max) = rarity.bomb_count_range();
    let (range_min, range_max) = rarity.bomb_range_range();

    // Generate stats within rarity ranges
    let power = generate_stat_in_range(
        &seed_bytes[3..7],
        stat_min,
        stat_max,
    );

    let speed = generate_stat_in_range(
        &seed_bytes[7..11],
        stat_min,
        stat_max,
    );

    let stamina = generate_stat_in_range(
        &seed_bytes[11..15],
        stat_min,
        stat_max,
    );

    let bomb_number = generate_stat_in_range_u8(
        &seed_bytes[15..17],
        bomb_min,
        bomb_max,
    );

    let bomb_range = generate_stat_in_range_u8(
        &seed_bytes[17..19],
        range_min,
        range_max,
    );

    // HP scales with rarity (2x to 5x the base stats)
    let hp_multiplier = match rarity {
        HeroRarity::Common => 2,
        HeroRarity::Uncommon => 3,
        HeroRarity::Rare => 3,
        HeroRarity::SuperRare => 4,
        HeroRarity::Epic => 4,
        HeroRarity::Legendary => 5,
    };

    let hp = (power + speed + stamina) * hp_multiplier;
    let max_hp = hp;

    Ok(Hero {
        id,
        skin_id,
        rarity,
        power,
        speed,
        stamina,
        max_stamina: stamina,
        bomb_number,
        bomb_range,
        hp,
        max_hp,
        last_action_time: timestamp,
    })
}

/// Generate a random u32 within a range [min, max] inclusive
fn generate_stat_in_range(seed: &[u8], min: u32, max: u32) -> u32 {
    if min == max {
        return min;
    }

    let seed_value = u32::from_le_bytes([
        seed[0],
        seed[1],
        seed.get(2).copied().unwrap_or(0),
        seed.get(3).copied().unwrap_or(0),
    ]);

    let range_size = max - min + 1;
    min + (seed_value % range_size)
}

/// Generate a random u8 within a range [min, max] inclusive
fn generate_stat_in_range_u8(seed: &[u8], min: u8, max: u8) -> u8 {
    if min == max {
        return min;
    }

    let seed_value = u16::from_le_bytes([seed[0], seed[1]]);
    let range_size = (max - min + 1) as u16;
    min + (seed_value % range_size) as u8
}

/// Calculate burn and treasury split based on percentage
/// Returns (burn_amount, treasury_amount)
pub fn calculate_burn_split(total: u64, burn_pct: u16) -> (u64, u64) {
    // burn_pct is 0-10000 where 10000 = 100%
    let burn_amount = (total as u128 * burn_pct as u128 / 10_000) as u64;
    let treasury_amount = total.saturating_sub(burn_amount);
    (burn_amount, treasury_amount)
}

/// Calculate referral bonus
pub fn calculate_referral_bonus(amount: u64, referral_pct: u16) -> u64 {
    // referral_pct is 0-10000 where 10000 = 100%
    (amount as u128 * referral_pct as u128 / 10_000) as u64
}

/// Calculate reward based on time elapsed and power (time-based mining)
/// Returns gross reward before fees
pub fn calculate_mining_reward(
    elapsed_seconds: u64,
    player_power: u64,
    bombcoin_per_block: u64,
    rewards_precision: u64,
) -> u64 {
    // Convert to hours for more intuitive rates
    let elapsed_hours = elapsed_seconds as f64 / 3600.0;

    // Reward = Hours × Power × Rate
    let reward = (elapsed_hours * player_power as f64 * bombcoin_per_block as f64) as u64;

    // Apply precision multiplier if needed
    if rewards_precision > 1 {
        reward * rewards_precision
    } else {
        reward
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rarity_distribution() {
        // Test rarity roll boundaries
        assert_eq!(HeroRarity::from_roll(0), HeroRarity::Common);
        assert_eq!(HeroRarity::from_roll(499), HeroRarity::Common);
        assert_eq!(HeroRarity::from_roll(500), HeroRarity::Uncommon);
        assert_eq!(HeroRarity::from_roll(799), HeroRarity::Uncommon);
        assert_eq!(HeroRarity::from_roll(800), HeroRarity::Rare);
        assert_eq!(HeroRarity::from_roll(949), HeroRarity::Rare);
        assert_eq!(HeroRarity::from_roll(950), HeroRarity::SuperRare);
        assert_eq!(HeroRarity::from_roll(989), HeroRarity::SuperRare);
        assert_eq!(HeroRarity::from_roll(990), HeroRarity::Epic);
        assert_eq!(HeroRarity::from_roll(998), HeroRarity::Epic);
        assert_eq!(HeroRarity::from_roll(999), HeroRarity::Legendary);
        assert_eq!(HeroRarity::from_roll(1000), HeroRarity::Legendary);
    }

    #[test]
    fn test_hmp_calculation() {
        let hero = Hero {
            id: 0,
            skin_id: 1,
            rarity: HeroRarity::Common,
            power: 10,
            speed: 10,
            stamina: 10,
            max_stamina: 10,
            bomb_number: 1,
            bomb_range: 2,
            hp: 100,
            max_hp: 100,
            last_action_time: 0,
        };

        // HMP = (10 * 1) + (2 * 0.5) + (10 * 2) = 10 + 1 + 20 = 31
        assert_eq!(hero.calculate_hmp(), 31.0);
    }

    #[test]
    fn test_hp_drain() {
        let hero = Hero {
            id: 0,
            skin_id: 1,
            rarity: HeroRarity::Common,
            power: 10,
            speed: 5,
            stamina: 10,
            max_stamina: 10,
            bomb_number: 1,
            bomb_range: 2,
            hp: 300,
            max_hp: 300,
            last_action_time: 0,
        };

        // Speed 5 = 5 HP per minute
        // 60 minutes = 300 HP drained
        let drain = hero.calculate_hp_drain(3600);
        assert_eq!(drain, 300);

        // 30 minutes = 150 HP drained
        let drain_30 = hero.calculate_hp_drain(1800);
        assert_eq!(drain_30, 150);
    }

    #[test]
    fn test_hp_recovery() {
        let hero = Hero {
            id: 0,
            skin_id: 1,
            rarity: HeroRarity::Common,
            power: 10,
            speed: 10,
            stamina: 10,
            max_stamina: 10,
            bomb_number: 1,
            bomb_range: 2,
            hp: 0,
            max_hp: 100,
            last_action_time: 0,
        };

        // Bench (1.0x): 120 seconds = 1 tick, 10 stamina = 10 HP
        let recovery_bench = hero.calculate_hp_recovery(120, 1.0);
        assert_eq!(recovery_bench, 10);

        // Restroom (3.0x): 120 seconds = 1 tick, 10 stamina * 3 = 30 HP
        let recovery_restroom = hero.calculate_hp_recovery(120, 3.0);
        assert_eq!(recovery_restroom, 30);

        // 240 seconds = 2 ticks, bench = 20 HP
        let recovery_2_ticks = hero.calculate_hp_recovery(240, 1.0);
        assert_eq!(recovery_2_ticks, 20);
    }

    #[test]
    fn test_burn_split() {
        // 50% burn (5000/10000)
        assert_eq!(calculate_burn_split(1000, 5000), (500, 500));

        // 30% burn (3000/10000)
        assert_eq!(calculate_burn_split(1000, 3000), (300, 700));

        // 0% burn
        assert_eq!(calculate_burn_split(1000, 0), (0, 1000));

        // 100% burn
        assert_eq!(calculate_burn_split(1000, 10000), (1000, 0));
    }

    #[test]
    fn test_referral_bonus() {
        // 2.5% referral (250/10000)
        assert_eq!(calculate_referral_bonus(1000, 250), 25);

        // 5% referral (500/10000)
        assert_eq!(calculate_referral_bonus(1000, 500), 50);

        // 0% referral
        assert_eq!(calculate_referral_bonus(1000, 0), 0);
    }

    #[test]
    fn test_mining_reward() {
        // 1 hour, 100 power, 10 coins/block rate, precision 1
        let reward = calculate_mining_reward(3600, 100, 10, 1);
        assert_eq!(reward, 1000); // 1 hour * 100 power * 10 rate = 1000

        // 2 hours
        let reward_2h = calculate_mining_reward(7200, 100, 10, 1);
        assert_eq!(reward_2h, 2000);

        // Half hour (1800 seconds)
        let reward_half = calculate_mining_reward(1800, 100, 10, 1);
        assert_eq!(reward_half, 500);
    }
}
