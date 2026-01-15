#!/bin/bash
# Just ensure rustup's binaries are first in PATH
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin"

# Show what we're using
echo "Cargo: $(which cargo)"
echo "Version: $(cargo --version)"
echo ""

# Clean and build
rm -rf target Cargo.lock
anchor build
