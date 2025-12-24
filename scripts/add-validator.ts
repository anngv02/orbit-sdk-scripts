import { createPublicClient, createWalletClient, http, encodeFunctionData, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

// --- CẤU HÌNH ---
// 1. Địa chỉ Rollup
const ROLLUP_ADDRESS = "0xDc833c373C2EC5d6FE16e504468EA4A507E7d10f"; 

// 2. Upgrade Executor
const UPGRADE_EXECUTOR_ADDRESS = "0x1919A903B4e6CfBb0Eec3abd826D2122B49e13f6";

// 3. ⚠️ ĐỊA CHỈ VALIDATOR MỚI (ĐỪNG QUÊN ĐIỀN VÀO ĐÂY)
const NEW_VALIDATOR_ADDRESS = "0xC64d7f9945F202Ebd1D328620cDF2Bf575803127"; 

const ROLLUP_ABI = [
  {
    inputs: [{ name: "_validator", type: "address[]" }, { name: "_val", type: "bool[]" }],
    name: "setValidator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

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
  console.log("🚀 BẮT ĐẦU THÊM VALIDATOR ...");

  if (!process.env.PRIVATE_KEY) throw new Error("❌ Thiếu PRIVATE_KEY");
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

  console.log(`👤 Admin: ${account.address}`);

  // 1. Đóng gói lệnh "setValidator"
  const payload = encodeFunctionData({
    abi: ROLLUP_ABI,
    functionName: 'setValidator',
    args: [
      [NEW_VALIDATOR_ADDRESS as `0x${string}`], 
      [true]
    ]
  });

  console.log(`📦 Payload đã đóng gói. Đang gửi thẳng vào Blockchain...`);

  // 2. GỬI TRANSACTION
  try {
    const hash = await client.writeContract({
      address: UPGRADE_EXECUTOR_ADDRESS as `0x${string}`,
      abi: EXECUTOR_ABI,
      functionName: 'executeCall',
      args: [ROLLUP_ADDRESS as `0x${string}`, payload]
    });

    console.log(`✅ Transaction sent! Hash: ${hash}`);
    console.log(`⏳ Đang chờ xác nhận...`);
    console.log(`👉 Theo dõi tại: https://sepolia.etherscan.io/tx/${hash}`);

    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`🎉 THÀNH CÔNG! Validator mới đã được thêm vào Rollup.`);
  } catch (e: any) {
    console.error("❌ Vẫn lỗi:", e);
    // Nếu vẫn lỗi, in ra raw request để debug
    if (e.cause) console.error("Nguyên nhân sâu xa:", e.cause);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });