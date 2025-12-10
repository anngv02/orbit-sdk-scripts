# Arbitrum Orbit x Celestia Scripts

TypeScript scripts to deploy an Arbitrum Orbit rollup and bootstrap the Celestia data-availability tooling. Strong familiarity with celestia-node and nitro.

## Create an Orbit chain

1. Clone and install:
   1. `git clone https://github.com/anngv02/orbit-sdk-scripts.git`
   2. `cd orbit-sdk-scripts`
   3. `npm install`
2. Add a `.env` file using the template below. If you run everything on a single machine you only need two private keys: one key goes into both `PRIVATE_KEY` and `BATCH_POSTER_PRIVATE_KEY`, the other key goes into `VALIDATOR_PRIVATE_KEY`. Leave the rest untouched unless you specifically need to change them.

```bash
# Deployment Wallet
PRIVATE_KEY=

# Data Availability Provider (Celestia)
DA_PROVIDER_ENABLE=true
DA_PROVIDER_URL=

# Optional: Advanced DA Provider settings
DA_PROVIDER_RETRIES=3
DA_PROVIDER_RETRY_ERRORS=websocket: close.*|dial tcp .*|.*i/o timeout|.*connection reset by peer|.*connection refused
DA_PROVIDER_ARG_LOG_LIMIT=2048
DA_PROVIDER_WS_MESSAGE_SIZE_LIMIT=268435456

# If you want separate keys for batch poster and validator
# If not set, will use PRIVATE_KEY for both
BATCH_POSTER_PRIVATE_KEY=
VALIDATOR_PRIVATE_KEY=

# RPC URLs
# require a rpc which allow to request a large number of requests(>50 request each second. To ensure run a long time to test, we need >500k request)
PARENT_CHAIN_RPC=
PARENT_CHAIN_ID=
PARENT_CHAIN_BEACON_RPC=
# Optional: Use Alchemy or Infura for better reliability
# SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
# SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_API_KEY
# PARENT_CHAIN_RPC=https://1rpc.io/359APyGjmosd2BCrW/sepolia

# Etherscan API (for verifying contracts)
# ETHERSCAN_API_KEY=

# Your Orbit Chain Configuration
CHAIN_ID=your_id
CHAIN_NAME=your_name_chain

# Validators (comma-separated addresses)
VALIDATOR_ADDRESSES=

# Batch Poster (address that will post transaction batches)
BATCH_POSTER_ADDRESS=

# Optional: Use custom ERC-20 token as gas token (leave empty for ETH)
NATIVE_TOKEN_ADDRESS=

# Wasm root used for validation
WASM_ROOT=0x597de35fc2ee60e5b2840157370d037542d6a4bc587af7f88202636c54e6bd8d

# Optional: Custom RollupCreator address (using default one in sepolia)
ROLLUP_CREATOR_ADDRESS=0x91120076656d3f19E14c70453bBD353b098631C4

DATA_AVAILABILITY_COMMITTEE=true
MAX_DATA_SIZE=117964
MAX_FEE_PER_GAS=100000000
```

3. `npm run check-balance`
   - The batch-poster wallet (private key) needs at least **0.5 Sepolia ETH**.
   - The validator wallet needs at least **1 Sepolia ETH**.
4. `npm run deploy`
5. `npm run parse-deployment`
6. Configure Docker so you can run it without sudo:
   1. `sudo groupadd docker`
   2. `export USER=$(whoami)`
   3. `sudo usermod -aG docker $USER`
   4. `sudo systemctl restart docker`
   5. Exit the terminal (`exit`) and log back in so the new group takes effect.
   6. Verify with `getent group docker`.
7. Run `./quick-start.sh` and answer the prompts (matches `docker-compose.yml`):
   - Core network (default `mocha-4`)
   - Core token (default `tia`)
   - Core gRPC URL (e.g. `consensus-full-mocha-4.celestia-mocha.com:9090`)
   - Namespace ID (default `aaab02f90e1864afed87` or your own 20-hex)
   - Celestia RPC endpoint for the server (default `http://celestia-light:2123`)
   - Celestia auth token (required(get at step 10), you can empty)
   - Validator blobstream address (required(you can find it in docs of sp1 blobstream to find contract address))
   - Validator ETH RPC URL (required(you can get rpc from .env))
   - Light node: `--p2p.network`, `--core.ip`, `--core.port`, `--node.store` (defaults: `mocha-4`, `consensus-full-mocha-4.celestia-mocha.com`, `9090`, `/home/celestia`)
   - The script writes `docker-compose.yml` and does **not** auto-start containers.

8. Before running Celestia services, you must create a persistent store for the light node and give correct permissions.
  - Create the directory: `mkdir -p ./celes-light`
  - Most Celestia containers run as user 10001, not root, so set ownership:
    `sudo chown -R 10001:10001 ./celes-light`
    `sudo chmod -R 755 ./celes-light`
9. Celestia Light Node must be initialized before you start the docker-compose stack. 
  - Run the init command:
  <code>docker run --rm -it \
  -v $(pwd)/celes-light:/home/celestia \
  --entrypoint "" \
  ghcr.io/celestiaorg/celestia-node:v0.28.4-mocha \
  celestia light init --p2p.network mocha-4
  </code>

10. You can get the auth token via bash:

- <code> docker run --rm -it \
  --entrypoint "" \
  -v $(pwd)/celes-light:/home/celestia \
  ghcr.io/celestiaorg/celestia-node:v0.28.4-mocha \
  celestia light auth admin \
    --p2p.network mocha \
    --node.store /home/celestia
</code>

11. Start services manually with Docker Compose (v2 `docker compose`):
   1. `docker compose up -d celestia-light`
      - Wait ~20 minutes for initial sync.
      - Logs: `docker compose logs -f celestia-light`
      - If needed to inspect/stop: `docker compose down`
   2. `docker compose up -d celestia-server`
      - Logs: `docker compose logs -f celestia-server`
   3. `docker compose up -d nitro-celestia-node`
      - Logs: `docker compose logs -f nitro-celestia-node`
12. If permission issues, add `user: "0:0"` under `celestia-server` in `docker-compose.yml`.
13. Use `celestia-server` logs to read block height and cross-check on Celenium.

## After deployment

- Deployment metadata lives in `deployments/deployment-{chainId}-{timestamp}.json`.
- Node configuration lives in `config/chain-{chainId}.json`.
- Use these files to bring up sequencer nodes, validator nodes, RPC endpoints, and to deploy your dApps on the new L2.

## Useful scripts

| Command | Description |
|---------|-------------|
| `npm run check-balance` | Check deployer and batch-poster wallet balances |
| `npm run deploy` | Deploy a new Orbit rollup to Sepolia |
| `npm run parse-deployment` | Parse the deployment txs and extract contract addresses |

## Quick troubleshooting

- If the `create rollup` transaction reverts, change the `CHAIN_ID` + `CHAIN_NAME` pair.
- Keep ≥0.5 ETH for the batch poster and ≥1 ETH for the validator before deploying.
- When you hit RPC issues, switch to backup endpoints listed in `.env`.
- For peer-dependency warnings during `npm install`, run `npm install --legacy-peer-deps`.

Keep your `.env` private and always back up the deployment artifacts to operate your nodes safely.
