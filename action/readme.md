# Deposit ETH/Tokens to Orbit Chain (L3)

Script to deposit ETH or ERC20 tokens from L2 (Sepolia) to your Orbit chain (L3). Makes 10 deposits automatically.

## Setup

1. **Create config file** `config/orbitSetupScriptConfig.json`:
```json
{
  "inbox": "0x6C10D1f15BdDe2a241d3AaA2c70D20c2B49eaca9",
  "nativeToken": "0x0000000000000000000000000000000000000000"
}
```
- `inbox`: Inbox contract address (from deployment files)
- `nativeToken`: `0x0000...` for ETH, or ERC20 token address

2. **Set environment variables** in `.env`:
```bash
PRIVATE_KEY_EXTERN=your_private_key
L2_RPC_URL=https://ethereum-sepolia.core.chainstack.com/your_key
L3_RPC_URL=http://localhost:8547
AMOUNT=100  # Only for ERC20 tokens
```

## Usage

```bash
npx tsx action/depositETH.ts
```

**ETH deposits:**
- 0.001 ETH per deposit × 10 = 0.01 ETH total
- 15s delay between deposits

**ERC20 deposits:**
- Amount from `AMOUNT` env var × 10
- 5s delay between deposits
- Requires token approval first

## Notes

- Ensure wallet has sufficient funds on L2 for deposits + gas
- For ERC20: approve Inbox contract before running
- Script waits 60s (ETH) or 15s (ERC20) before checking final balance
- To customize: edit `depositCount` and `depositAmount` in the code

