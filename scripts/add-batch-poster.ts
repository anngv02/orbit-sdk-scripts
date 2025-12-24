import { createPublicClient, createWalletClient, http, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env') });

// --- CẤU HÌNH ---

// 1. Địa chỉ Sequencer Inbox
const SEQUENCER_INBOX_ADDRESS = "0xe92B27e9d19fc9024F79a9bF130D26166634D47A"; 

// 2. Upgrade Executor
const UPGRADE_EXECUTOR_ADDRESS = "0x1919A903B4e6CfBb0Eec3abd826D2122B49e13f6";

// 3. ⚠️ ĐỊA CHỈ BATCH POSTER MỚI (ĐIỀN VÀO ĐÂY)
const NEW_BATCH_POSTER_ADDRESS = "0x72D013b3Cac89cf870943e383d6Fc6812814F414"; 

// ABI của SequencerInbox để set Batch Poster
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

// ABI của UpgradeExecutor để thực thi lệnh
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
  console.log("🚀 BẮT ĐẦU THÊM BATCH POSTER...");
  console.log("------------------------------------------------");

  if (!process.env.PRIVATE_KEY) throw new Error("❌ Thiếu PRIVATE_KEY trong .env");
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

  console.log(`👤 Admin thực hiện: ${account.address}`);
  console.log(`🎯 Target Contract (SequencerInbox): ${SEQUENCER_INBOX_ADDRESS}`);
  console.log(`new Batch Poster: ${NEW_BATCH_POSTER_ADDRESS}`);

  // 1. Đóng gói lệnh "setIsBatchPoster"
  // Lưu ý: Hàm này nhận (address, bool) chứ không phải mảng như setValidator
  const payload = encodeFunctionData({
    abi: SEQUENCER_INBOX_ABI,
    functionName: 'setIsBatchPoster',
    args: [
      NEW_BATCH_POSTER_ADDRESS as `0x${string}`, 
      true // true = cấp quyền, false = thu hồi quyền
    ]
  });

  console.log(`📦 Payload đã đóng gói. Đang gửi transaction...`);

  // 2. GỬI TRANSACTION qua UpgradeExecutor
  try {
    // executeCall(target, payload)
    // target ở đây phải là SEQUENCER_INBOX_ADDRESS
    const hash = await client.writeContract({
      address: UPGRADE_EXECUTOR_ADDRESS as `0x${string}`,
      abi: EXECUTOR_ABI,
      functionName: 'executeCall',
      args: [SEQUENCER_INBOX_ADDRESS as `0x${string}`, payload]
    });

    console.log(`✅ Transaction sent! Hash: ${hash}`);
    console.log(`⏳ Đang chờ xác nhận...`);
    console.log(`👉 Theo dõi tại: https://sepolia.etherscan.io/tx/${hash}`);

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    if (receipt.status === 'success') {
        console.log(`🎉 THÀNH CÔNG! Batch Poster mới đã được thêm.`);
        console.log(`   Địa chỉ: ${NEW_BATCH_POSTER_ADDRESS}`);
        console.log(`   Bạn có thể dùng địa chỉ này để chạy node Batch Poster dự phòng.`);
    } else {
        console.error(`❌ Transaction thất bại (Reverted)`);
    }

  } catch (e: any) {
    console.error("❌ Lỗi xảy ra:", e);
    if (e.cause) console.error("Nguyên nhân:", e.cause);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });