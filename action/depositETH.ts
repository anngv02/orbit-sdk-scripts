import { ethers } from "ethers";
import { ERC20__factory } from "@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory";
import fs from "fs";

import dotenv from "dotenv";
dotenv.config();

// Delay function
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Read the JSON configuration
const configRaw = fs.readFileSync(
  "./config/orbitSetupScriptConfig.json",
  "utf-8"
);
const config = JSON.parse(configRaw);
const ERC20InboxAddress = config.inbox;

const erc20InboxInterface = new ethers.utils.Interface([
  "function depositERC20(uint256) public returns (uint256)",
]);

// console.log(config);

async function main() {
  const privateKey = process.env.PRIVATE_KEY_EXTERN;
  const L2_RPC_URL = process.env.L2_RPC_URL;
  const L3_RPC_URL = process.env.L3_RPC_URL;
  const amount = process.env.AMOUNT;

  // console.log("Private Key:", privateKey);

  if (!privateKey || !L2_RPC_URL || !L3_RPC_URL || !amount) {
    throw new Error("Required environment variable not found");
  }

  const l2Provider = new ethers.providers.JsonRpcProvider(L2_RPC_URL);
  const l3Provider = new ethers.providers.JsonRpcProvider(L3_RPC_URL);
  const l2Signer = new ethers.Wallet(privateKey).connect(l2Provider);
  
  // Display wallet address
  console.log(`\n📋 Your wallet address: ${l2Signer.address}`);
  console.log(`💰 Funds will be deposited to this address on your Orbit Chain (L3)\n`);

  const erc20Inbox = new ethers.Contract(
    ERC20InboxAddress,
    erc20InboxInterface,
    l2Signer
  );

  const nativeToken = config.nativeToken;
  const depositCount = 10;
  const depositAmount = "0.001"; // ETH per deposit

  if (nativeToken === ethers.constants.AddressZero) {
    const inboxAddress = config.inbox;
    const depositEthInterface = new ethers.utils.Interface([
      "function depositEth() public payable",
    ]);
    // create contract instance
    const contract = new ethers.Contract(
      inboxAddress,
      depositEthInterface,
      l2Signer
    );

    // Check initial balance on L3
    const initialBalance = await l3Provider.getBalance(l2Signer.address);
    console.log(`Initial balance on L3 chain: ${ethers.utils.formatEther(initialBalance)} ETH`);
    
    // Deposit 15 times, 0.01 ETH each time
    console.log(`\nStarting ${depositCount} deposits of ${depositAmount} ETH each...`);
    const totalAmount = parseFloat(depositAmount) * depositCount;
    console.log(`Total amount to deposit: ${totalAmount} ETH\n`);

    for (let i = 1; i <= depositCount; i++) {
      console.log(`\n[${i}/${depositCount}] Depositing ${depositAmount} ETH...`);
      const tx = await contract.depositEth({
        value: ethers.utils.parseEther(depositAmount),
      });
      console.log(`Transaction hash: ${tx.hash}`);
      await tx.wait();
      console.log(`✓ Deposit ${i} completed and mined`);
      
      // Wait a bit between transactions (except for the last one)
      if (i < depositCount) {
        console.log("Waiting 15 seconds before next deposit...");
        await delay(15 * 1000);
      }
    }

    console.log(`\n🎉 All ${depositCount} deposits completed! Total: ${totalAmount} ETH deposited.`);
    
    // Check final balance on L3 after deposits
    console.log("\n⏳ Waiting 60 seconds before checking balance on L3...");
    await delay(60 * 1000);
    
    const finalBalance = await l3Provider.getBalance(l2Signer.address);
    const balanceChange = finalBalance.sub(initialBalance);
    console.log(`\n📊 Balance Summary on L3 chain:`);
    console.log(`   Initial balance: ${ethers.utils.formatEther(initialBalance)} ETH`);
    console.log(`   Final balance: ${ethers.utils.formatEther(finalBalance)} ETH`);
    console.log(`   Balance change: ${ethers.utils.formatEther(balanceChange)} ETH`);
    console.log(`   Expected change: ${totalAmount} ETH`);
  } else {
    const nativeTokenContract = ERC20__factory.connect(nativeToken, l2Provider);
    const decimals = await nativeTokenContract.decimals();
    if (decimals !== 18) {
      throw new Error("We currently only support 18 decimals token");
    }

    // Check initial balance on L3 (for native token if applicable)
    const initialBalance = await l3Provider.getBalance(l2Signer.address);
    console.log(`Initial balance on L3 chain: ${ethers.utils.formatEther(initialBalance)} ETH`);
    
    // Deposit 15 times for ERC20 tokens
    console.log(`\nStarting ${depositCount} deposits of ${amount} tokens each...`);
    const totalAmount = parseFloat(amount) * depositCount;
    console.log(`Total amount to deposit: ${totalAmount} tokens\n`);

    for (let i = 1; i <= depositCount; i++) {
      console.log(`\n[${i}/${depositCount}] Depositing ${amount} tokens...`);
      const tx = await erc20Inbox.depositERC20(
        ethers.utils.parseUnits(amount, decimals)
      );
      console.log(`Transaction hash: ${tx.hash}`);
      await tx.wait();
      console.log(`✓ Deposit ${i} completed and mined`);
      
      // Wait a bit between transactions (except for the last one)
      if (i < depositCount) {
        console.log("Waiting 5 seconds before next deposit...");
        await delay(5 * 1000);
      }
    }

    console.log(`\n🎉 All ${depositCount} deposits completed! Total: ${totalAmount} tokens deposited.`);
    
    // Check final balance on L3 after deposits
    console.log("\n⏳ Waiting 15 seconds before checking balance on L3...");
    await delay(15 * 1000);
    
    const finalBalance = await l3Provider.getBalance(l2Signer.address);
    const balanceChange = finalBalance.sub(initialBalance);
    console.log(`\n📊 Balance Summary on L3 chain:`);
    console.log(`   Initial balance: ${ethers.utils.formatEther(initialBalance)} ETH`);
    console.log(`   Final balance: ${ethers.utils.formatEther(finalBalance)} ETH`);
    console.log(`   Balance change: ${ethers.utils.formatEther(balanceChange)} ETH`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
