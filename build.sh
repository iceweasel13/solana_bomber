#!/bin/bash
export PATH="$(pwd)/.local/bin:$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/bin:/opt/homebrew/bin"
rm -rf target Cargo.lock
anchor build
