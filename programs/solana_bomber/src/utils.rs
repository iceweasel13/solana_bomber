use anchor_lang::prelude::*;
use crate::state::*;

/// Get the phase-based reward rate (coins per HMP per hour)
pub fn get_phase_rate(total_mined: u64) -> f64 {
    match total_mined {
        0..=25_000_000_000_000 => 10.0,      // Phase 1: 0-25M (in lamports: 25M * 1M)
        25_000_000_000_001..=50_000_000_000_000 => 5.0,   // Phase 2: 25M-50M
        50_000_000_000_001..=75_000_000_000_000 => 2.5,   // Phase 3: 50M-75M
        75_000_000_000_001..=100_000_000_000_000 => 1.25, // Phase 4: 75M-100M
        _ => 0.0, // Supply exhausted
    }
}

/// Generate a random hero with stats based on rarity
/// Uses blockhash + slot + user pubkey as pseudo-randomness source
pub fn generate_hero(
    id: u16,
    timestamp: i64,
    slot: u64,
    user_pubkey: Pubkey,
) -> Result<Hero> {
    // Create seed from multiple entropy sources
    let mut seed_data = Vec::new();
    seed_data.extend_from_slice(&timestamp.to_le_bytes());
    seed_data.extend_from_slice(&slot.to_le_bytes());
    seed_data.extend_from_slice(user_pubkey.as_ref());
    seed_data.extend_from_slice(&id.to_le_bytes());

    // Use simple hash for pseudo-random generation
    // Combine bytes and create a deterministic hash-like result
    let mut seed_bytes = [0u8; 32];
    for (i, chunk) in seed_data.chunks(32).enumerate() {
        for (j, &byte) in chunk.iter().enumerate() {
            seed_bytes[j] ^= byte.wrapping_add((i as u8).wrapping_mul(17));
        }
    }

    // Roll rarity (0-9999)
    let rarity_seed = u16::from_le_bytes([seed_bytes[0], seed_bytes[1]]) % 10_000;
    let rarity = HeroRarity::roll(rarity_seed);

    // Generate stats within rarity ranges
    let power = generate_stat_in_range(
        &seed_bytes[2..6],
        rarity.get_power_range(),
    );

    let speed = generate_stat_in_range(
        &seed_bytes[6..10],
        rarity.get_speed_range(),
    );

    let stamina = generate_stat_in_range(
        &seed_bytes[10..14],
        rarity.get_stamina_range(),
    );

    let bomb_number = generate_stat_in_range_u8(
        &seed_bytes[14..16],
        rarity.get_bomb_number_range(),
    );

    let bomb_range = generate_stat_in_range_u8(
        &seed_bytes[16..18],
        rarity.get_bomb_range_range(),
    );

    let hp = generate_stat_in_range(
        &seed_bytes[18..22],
        rarity.get_hp_range(),
    );

    Ok(Hero {
        id,
        rarity,
        power,
        speed,
        stamina,
        max_stamina: stamina,
        bomb_number,
        bomb_range,
        hp,
        max_hp: hp,
        last_action_time: timestamp,
    })
}

/// Generate a random u32 within a range [min, max] inclusive
fn generate_stat_in_range(seed: &[u8], range: (u32, u32)) -> u32 {
    let (min, max) = range;
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
fn generate_stat_in_range_u8(seed: &[u8], range: (u8, u8)) -> u8 {
    let (min, max) = range;
    if min == max {
        return min;
    }

    let seed_value = u16::from_le_bytes([seed[0], seed[1]]);
    let range_size = (max - min + 1) as u16;
    min + (seed_value % range_size) as u8
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_phase_rates() {
        assert_eq!(get_phase_rate(0), 10.0);
        assert_eq!(get_phase_rate(25_000_000_000_000), 10.0);
        assert_eq!(get_phase_rate(25_000_000_000_001), 5.0);
        assert_eq!(get_phase_rate(50_000_000_000_000), 5.0);
        assert_eq!(get_phase_rate(50_000_000_000_001), 2.5);
        assert_eq!(get_phase_rate(75_000_000_000_000), 2.5);
        assert_eq!(get_phase_rate(75_000_000_000_001), 1.25);
        assert_eq!(get_phase_rate(100_000_000_000_000), 1.25);
        assert_eq!(get_phase_rate(100_000_000_000_001), 0.0);
    }

    #[test]
    fn test_hmp_calculation() {
        let hero = Hero {
            id: 0,
            rarity: HeroRarity::Common,
            power: 3,
            speed: 2,
            stamina: 5,
            max_stamina: 5,
            bomb_number: 1,
            bomb_range: 2,
            hp: 100,
            max_hp: 100,
            last_action_time: 0,
        };

        // HMP = (3 * 1) + (2 * 0.5) + (2 * 2) = 3 + 1 + 4 = 8
        assert_eq!(hero.calculate_hmp(), 8.0);
    }

    #[test]
    fn test_hp_drain() {
        let hero = Hero {
            id: 0,
            rarity: HeroRarity::Common,
            power: 3,
            speed: 5,
            stamina: 5,
            max_stamina: 5,
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
}
