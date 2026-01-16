import { PublicKey, Connection, clusterApiUrl } from "@solana/web3.js";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";

// Program ID from deployment (Updated to fresh deployment)
export const PROGRAM_ID = new PublicKey("5ADLMwFhWfUHd1rxbRa3DZ8mVCZMDoJryfMi1dAxRNpc");

// Network configuration
export const NETWORK = "devnet";
export const RPC_ENDPOINT = clusterApiUrl(NETWORK);

// PDA seeds
export const GLOBAL_STATE_SEED = "global_state";
export const USER_ACCOUNT_SEED = "user_account";
export const REWARD_TOKEN_MINT_SEED = "reward_token_mint";

// Derive PDAs
export function getGlobalStatePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(GLOBAL_STATE_SEED)],
    PROGRAM_ID
  );
}

export function getRewardTokenMintPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(REWARD_TOKEN_MINT_SEED)],
    PROGRAM_ID
  );
}

export function getUserAccountPDA(userPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(USER_ACCOUNT_SEED), userPubkey.toBuffer()],
    PROGRAM_ID
  );
}

// Create connection
export function getConnection(): Connection {
  return new Connection(RPC_ENDPOINT, "confirmed");
}
