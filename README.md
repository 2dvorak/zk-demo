# ZK circuit build demo

## Overview

This repo demos to build ZK circuits, then use that circuit to prove & verify ZK proofs.

## Prerequisite

- Node.js (tested with v17.4.0)
- [Circom](https://docs.circom.io/getting-started/installation/)

Install Node.js packages using:
```
npm install
```

## Sample hasher circuit

This repo contains a sample circuit, `hasher.circom`.
It takes 4 integer array and calculate SHA256 hash of the input.

For example, to get SHA256 hash of the string "klay", the input would be:
```
{"msg": ["107","108","97","121"]}
```
because 'k' is 107 in ASCII.

### Building circuits

To build circuit using circom, run:
```
mkdir -p build
circom -o build --r1cs --wasm circuits/hasher.circom
```

### Generate and verify proof

Now, you can calculate witness for the sample input `input.json`, which contains the string "klay".
```
node build/hasher_js/generate_witness.js build/hasher_js/hasher.wasm input.json witness.wtns
```

You need "powers of tau" file to generate proofs for your circuit and witness. Download one.
```
wget -nc https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau
```

Now we can prepare proving key and verification key for our circuit.
```
npx snarkjs groth16 setup build/hasher.r1cs powersOfTau28_hez_final_15.ptau hasher.zkey
npx snarkjs zkey export verificationkey hasher.zkey hasher.vkey
```

At last, let's generate proof.
```
npx snarkjs groth16 prove hasher.zkey witness.wtns proof.json public.json
```

You can verify generated proof by running:
```
npx snarkjs groth16 verify hasher.vkey public.json proof.json
```

### Deploy ZK verifier contract and verify proof

You can generate a verifier contract for our ZK circuit.
```
npx snarkjs zkey export solidityverifier hasher.zkey verifier.sol
```

Deploy your verifier contract. One of the options could be using [Remix](https://remix.ethereum.org).

To generate call data for your input, run:
```
npx snarkjs generatecall
```

Use generated output to call `verifyProof` in your deployed contract. The result should be `true`.

### Verifying the output of the circuit

Our sample hasher circuit outputs the SHA256 hash of input message. The output is in the file public.json:
```
[
 "34752292369745715427145082861773840882",
 "231533752148791046506351216215697009192"
]
```

If we convert those decimal numbers to hex, and then concat 2 hex string, we get
```
0x1A250C4D13AC2BAD8FDDA96A04B2E1F2AE2FC754F2F1DD92591566C103622A28
```

which is the SHA256 hash of the string "klay". You can confirm this by:
```
echo -n "klay" | sha256sum
```


## Test using script

All above command are provided with the script `test/run_all.sh`.

Or you can do the same tests in Node.js, by running

```
npx hardhat test
```

which generate proof, verify the proof, deploy verifier contract in hardhat network and verify proof using deployed contract using SnarkJS APIs.

