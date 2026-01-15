#!/bin/bash

# Use rustup run to ensure proper toolchain handling
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.rustup/toolchains/1.85.0-aarch64-apple-darwin/bin:$HOME/.cargo/bin:$PATH"

# Create a cargo wrapper that uses rustup
mkdir -p .build-tools
cat > .build-tools/cargo << 'INNER_EOF'
#!/bin/bash
exec rustup run 1.85.0 cargo "$@"
INNER_EOF
chmod +x .build-tools/cargo

# Prepend our wrapper to PATH
export PATH="$(pwd)/.build-tools:$PATH"

# Verify
echo "Using cargo: $(which cargo)"
echo "Cargo version: $(cargo --version)"
echo ""

# Clean and build
rm -rf target Cargo.lock
anchor build
