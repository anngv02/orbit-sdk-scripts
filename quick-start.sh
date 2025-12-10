#!/bin/bash

# Orbit x Celestia Node Quick Start Script
# This script helps you quickly spin up a node for your deployed Orbit rollup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_info "Orbit x Celestia Node Setup"
echo ""

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists docker; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi
print_success "Docker is installed"

if docker compose version >/dev/null 2>&1; then
    print_success "Docker Compose (v2 plugin) is available"
elif command_exists docker-compose; then
    print_warning "Using legacy docker-compose binary. Prefer 'docker compose' if available."
else
    print_error "Docker Compose is not installed. Please install Docker Compose (docker compose) first."
    exit 1
fi

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi
print_success "Node.js is installed"

# Smart config file detection
CONFIG_PATH=""
if [ -f "./config/nodeConfig.json" ]; then
    CONFIG_PATH="./config/nodeConfig.json"
    print_success "Found nodeConfig.json at $CONFIG_PATH"
elif [ -f "./config/node-config.json" ]; then
    CONFIG_PATH="./config/node-config.json"
    print_success "Found node-config.json at $CONFIG_PATH"
elif [ -f "./nodeConfig.json" ]; then
    CONFIG_PATH="./nodeConfig.json"
    print_success "Found nodeConfig.json at $CONFIG_PATH"
elif [ -d "./config" ]; then
    # Look for node-config-*.json or nodeConfig-*.json files
    shopt -s nullglob
    NODE_CONFIGS=(./config/node-config*.json ./config/nodeConfig*.json)
    shopt -u nullglob

    if [ ${#NODE_CONFIGS[@]} -eq 1 ]; then
        CONFIG_PATH="${NODE_CONFIGS[0]}"
        print_success "Found config file at $CONFIG_PATH"
    elif [ ${#NODE_CONFIGS[@]} -gt 1 ]; then
        print_error "Multiple config files found:"
        for config in "${NODE_CONFIGS[@]}"; do
            echo "  - $config"
        done
        echo ""
        print_info "Please specify which config to use:"
        read -p "$(echo -e ${BLUE}Enter path to config file: ${NC})" CONFIG_PATH
        if [ ! -f "$CONFIG_PATH" ]; then
            print_error "File not found: $CONFIG_PATH"
            exit 1
        fi
    else
        print_error "Node config file not found. Please run the deployment script first."
        echo ""
        print_info "Expected locations:"
        echo "  - ./config/nodeConfig.json"
        echo "  - ./config/node-config-{chainId}.json"
        echo "  - ./nodeConfig.json"
        exit 1
    fi
else
    print_error "Node config file not found. Please run the deployment script first."
    echo ""
    print_info "Expected locations:"
    echo "  - ./config/nodeConfig.json"
    echo "  - ./config/node-config-{chainId}.json"
    echo "  - ./nodeConfig.json"
    exit 1
fi

# Celestia configuration (prompted)
echo ""
print_info "Celestia configuration"

read -p "$(echo -e ${BLUE}Enter Celestia core network ${NC}[default: mocha-4]: )" CELESTIA_CORE_NETWORK
CELESTIA_CORE_NETWORK=${CELESTIA_CORE_NETWORK:-mocha-4}

read -p "$(echo -e ${BLUE}Enter Celestia core token ${NC}[default: tia]: )" CELESTIA_CORE_TOKEN
CELESTIA_CORE_TOKEN=${CELESTIA_CORE_TOKEN:-tia}

read -p "$(echo -e ${BLUE}Enter Celestia core URL (gRPC) ${NC}[default: consensus-full-mocha-4.celestia-mocha.com:9090]: )" CELESTIA_CORE_URL
CELESTIA_CORE_URL=${CELESTIA_CORE_URL:-consensus-full-mocha-4.celestia-mocha.com:9090}

read -p "$(echo -e ${BLUE}Enter Celestia namespace ID ${NC}[default: aaab02f90e1864afed87]: )" CELESTIA_NAMESPACE
CELESTIA_NAMESPACE=${CELESTIA_NAMESPACE:-aaab02f90e1864afed87}

read -p "$(echo -e ${BLUE}Enter Celestia RPC endpoint ${NC}[default: http://celestia-light:2123]: )" CELESTIA_RPC
CELESTIA_RPC=${CELESTIA_RPC:-http://celestia-light:2123}

read -p "$(echo -e ${BLUE}Enter Celestia auth token ${NC}[required]: )" CELESTIA_AUTH_TOKEN
if [ -z "$CELESTIA_AUTH_TOKEN" ]; then
    print_error "Celestia auth token is required."
    exit 1
fi

read -p "$(echo -e ${BLUE}Enter Celestia validator blobstream address ${NC}[required]: )" CELESTIA_BLOBSTREAM
if [ -z "$CELESTIA_BLOBSTREAM" ]; then
    print_error "Celestia validator blobstream address is required."
    exit 1
fi

read -p "$(echo -e ${BLUE}Enter Celestia validator ETH RPC URL ${NC}[required]: )" CELESTIA_VALIDATOR_ETH_RPC
if [ -z "$CELESTIA_VALIDATOR_ETH_RPC" ]; then
    print_error "Celestia validator ETH RPC URL is required."
    exit 1
fi

read -p "$(echo -e ${BLUE}Enter Celestia light p2p network ${NC}[default: mocha-4]: )" CELESTIA_P2P_NETWORK
CELESTIA_P2P_NETWORK=${CELESTIA_P2P_NETWORK:-mocha-4}

read -p "$(echo -e ${BLUE}Enter Celestia core IP ${NC}[default: consensus-full-mocha-4.celestia-mocha.com]: )" CELESTIA_CORE_IP
CELESTIA_CORE_IP=${CELESTIA_CORE_IP:-consensus-full-mocha-4.celestia-mocha.com}

read -p "$(echo -e ${BLUE}Enter Celestia core port ${NC}[default: 9090]: )" CELESTIA_CORE_PORT
CELESTIA_CORE_PORT=${CELESTIA_CORE_PORT:-9090}

read -p "$(echo -e ${BLUE}Enter Celestia node store path ${NC}[default: /home/celestia]: )" CELESTIA_NODE_STORE
CELESTIA_NODE_STORE=${CELESTIA_NODE_STORE:-/home/celestia}

print_info "Core network: $CELESTIA_CORE_NETWORK"
print_info "Core token: $CELESTIA_CORE_TOKEN"
print_info "Core URL (gRPC): $CELESTIA_CORE_URL"
print_info "Namespace ID: $CELESTIA_NAMESPACE"
print_info "Celestia RPC: $CELESTIA_RPC"
print_info "Blobstream: $CELESTIA_BLOBSTREAM"
print_info "Validator ETH RPC: $CELESTIA_VALIDATOR_ETH_RPC"
print_info "Light p2p network: $CELESTIA_P2P_NETWORK"
print_info "Core IP/Port: $CELESTIA_CORE_IP:$CELESTIA_CORE_PORT"
print_info "Node store: $CELESTIA_NODE_STORE"
print_info "Auth token (first 12 chars): ${CELESTIA_AUTH_TOKEN:0:12}..."

# Normalize config path for Docker bind mount
CONFIG_PATH_ABS="$(cd "$(dirname "$CONFIG_PATH")" && pwd)/$(basename "$CONFIG_PATH")"

# Generate docker-compose.yml mirroring the provided template
echo ""
print_info "Writing docker-compose.yml with preset Celestia values..."
cat > "$SCRIPT_DIR/docker-compose.yml" <<EOF
services:
  nitro-celestia-node:
    image: ghcr.io/celestiaorg/nitro:v3.6.8
    container_name: orbit-annnn-orbit-chain
    depends_on:
      - celestia-server
    ports:
      - "8547:8449"
      - "8548:8548"
      - "9642:9642"
      - "6070:6070"
    volumes:
      - ${CONFIG_PATH_ABS}:/home/user/nodeConfig.json:ro
      - node-data:/home/user/.arbitrum/local/nitro
    command:
      - --conf.file
      - /home/user/nodeConfig.json

  celestia-server:
    image: ghcr.io/celestiaorg/nitro-das-celestia:v0.6.3-mocha
    container_name: celestia-server
    depends_on:
      - celestia-light
    entrypoint:
      - "/bin/celestia-server"
      - "--celestia.experimental-tx-client"
      - "--celestia.core-network"
      - "${CELESTIA_CORE_NETWORK}"
      - "--celestia.core-token"
      - "${CELESTIA_CORE_TOKEN}"
      - "--celestia.core-url"
      - "${CELESTIA_CORE_URL}"
      - "--celestia.with-writer"
      - "--celestia.namespace-id"
      - "${CELESTIA_NAMESPACE}"
      - "--rpc-addr"
      - "0.0.0.0"
      - "--rpc-port"
      - "26657"
      - "--celestia.rpc"
      - "${CELESTIA_RPC}"
      - "--log-level"
      - "DEBUG"
      - "--celestia.auth-token"
      - "${CELESTIA_AUTH_TOKEN}"
      - "--celestia.validator-config.blobstream"
      - "${CELESTIA_BLOBSTREAM}"
      - "--celestia.validator-config.eth-rpc"
      - "${CELESTIA_VALIDATOR_ETH_RPC}"
    ports:
      - "1317:1317"
      - "9090:9090"
      - "26657:26657"
      - "1095:1095"
      - "8080:8080"
      - "26658:26658"
    volumes:
      - celestia-keys:/home/celestia/

  celestia-light:
    image: ghcr.io/celestiaorg/celestia-node:v0.28.4-mocha
    container_name: celestia-light
    entrypoint: [""]
    command:
      [
        "celestia",
        "light",
        "start",
        "--p2p.network", "${CELESTIA_P2P_NETWORK}",
        "--core.ip", "${CELESTIA_CORE_IP}",
        "--core.port", "${CELESTIA_CORE_PORT}",
        "--rpc.addr", "0.0.0.0",
        "--rpc.port", "2123",
        "--node.store", "${CELESTIA_NODE_STORE}"
      ]
    ports:
      - "2121:2121"
      - "2123:2123"
    volumes:
      - ./celes-light:/home/celestia

volumes:
  node-data:
  celestia-keys:
  celestia-light:
EOF

print_success "docker-compose.yml written to $SCRIPT_DIR/docker-compose.yml"

# Manual next steps (no automatic docker compose run)
echo ""
print_info "Next steps (run manually with 'docker compose'):"
echo " 1) Start Celestia light node: docker compose up -d celestia-light"
echo "    - Wait ~20 minutes for initial sync."
echo "    - Check logs: docker compose logs -f celestia-light"
echo "    - If issues, stop to inspect: docker compose down"
echo ""
echo " 2) Start Celestia server: docker compose up -d celestia-server"
echo "    - Check logs: docker compose logs -f celestia-server"
echo ""
echo " 3) Start Nitro node: docker compose up -d nitro-celestia-node"
echo "    - Check logs: docker compose logs -f nitro-celestia-node"
echo ""
print_success "Setup complete! docker-compose.yml is ready."