#!/bin/sh

set -ex

# Make build directory
mkdir -p build

# Build circuit
circom -o build --r1cs --wasm circuits/hasher.circom

# Calculate witness
node build/hasher_js/generate_witness.js build/hasher_js/hasher.wasm input.json witness.wtns

# Download ptau
wget -nc https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau

# Prepare proving key and verification key
npx snarkjs groth16 setup build/hasher.r1cs powersOfTau28_hez_final_15.ptau hasher.zkey
npx snarkjs zkey export verificationkey hasher.zkey hasher.vkey

# Generate proof
npx snarkjs groth16 prove hasher.zkey witness.wtns proof.json public.json

# Verify proof
npx snarkjs groth16 verify hasher.vkey public.json proof.json

# Generate verifier contract
npx snarkjs zkey export solidityverifier hasher.zkey verifier.sol

# Generate call data
npx snarkjs generatecall
