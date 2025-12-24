import { createPublicClient, createWalletClient, http, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

// --- CONFIGURATION ---

// 1. Sequencer Inbox Address
const SEQUENCER_INBOX_ADDRESS = "0xe92B27e9d19fc9024F79a9bF130D26166634D47A"; 

// 2. Upgrade Executor
const UPGRADE_EXECUTOR_ADDRESS = "0x1919A903B4e6CfBb0Eec3abd826D2122B49e13f6";

// 3. ⚠️ NEW BATCH POSTER ADDRESS (FILL THIS IN)
const NEW_BATCH_POSTER_ADDRESS = "0x72D013b3Cac89cf870943e383d6Fc6812814F414"; 

// ABI for SequencerInbox to set Batch Poster
const SEQUENCER_INBOX_ABI = [
  {
    inputs: [
      { name: "addr", type: "address" },
      { name: "isBatchPoster", type: "bool" }
    ],
    name: "setIsBatchPoster",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

// ABI for UpgradeExecutor to execute command
const EXECUTOR_ABI = [
  {
    inputs: [{ name: "target", type: "address" }, { name: "payload", type: "bytes" }],
    name: "executeCall",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  }
] as const;

async function main() {
  console.log("🚀 STARTING ADD BATCH POSTER...");
  console.log("------------------------------------------------");

  if (!process.env.PRIVATE_KEY) throw new Error("❌ Missing PRIVATE_KEY in .env");
  const pk = process.env.PRIVATE_KEY.startsWith('0x') ? process.env.PRIVATE_KEY : `0x${process.env.PRIVATE_KEY}`;
  const account = privateKeyToAccount(pk as `0x${string}`);
  
  const rpcUrl = process.env.PARENT_CHAIN_RPC;
  
  const client = createWalletClient({
    account,
    chain: sepolia,
    transport: http(rpcUrl)
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl)
  });

  console.log(`👤 Executing Admin: ${account.address}`);
  console.log(`🎯 Target Contract (SequencerInbox): ${SEQUENCER_INBOX_ADDRESS}`);
  console.log(`New Batch Poster: ${NEW_BATCH_POSTER_ADDRESS}`);

  // 1. Encode "setIsBatchPoster" command
  const payload = encodeFunctionData({
    abi: SEQUENCER_INBOX_ABI,
    functionName: 'setIsBatchPoster',
    args: [
      NEW_BATCH_POSTER_ADDRESS as `0x${string}`, 
      true // true = grant permission, false = revoke permission
    ]
  });

  console.log(`📦 Payload encoded. Sending transaction...`);

  // 2. SEND TRANSACTION via UpgradeExecutor
  try {
    // executeCall(target, payload)
    // target here must be SEQUENCER_INBOX_ADDRESS
    const hash = await client.writeContract({
      address: UPGRADE_EXECUTOR_ADDRESS as `0x${string}`,
      abi: EXECUTOR_ABI,
      functionName: 'executeCall',
      args: [SEQUENCER_INBOX_ADDRESS as `0x${string}`, payload]
    });

    console.log(`✅ Transaction sent! Hash: ${hash}`);
    console.log(`⏳ Waiting for confirmation...`);
    console.log(`👉 Track at: https://sepolia.etherscan.io/tx/${hash}`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
        console.log(`🎉 SUCCESS! New Batch Poster has been added.`);
        console.log(`   Address: ${NEW_BATCH_POSTER_ADDRESS}`);
        console.log(`   You can use this address to run a backup Batch Poster node.`);
    } else {
        console.error(`❌ Transaction failed (Reverted)`);
    }

  } catch (e: any) {
    console.error("❌ Error occurred:", e);
    if (e.cause) console.error("Cause:", e.cause);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });