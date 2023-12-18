const path = require("path");
const fs = require("fs");
const snark = require("snarkjs");
const assert = require('chai').assert;
const expect = require('chai').expect;

const hardhat = require("hardhat");

async function checkPathExists(filePath) {
    try {
        await fs.promises.access(filePath, fs.constants.F_OK);
        return true;
    } catch (err) {
        console.log("err", err);
        return false;
    }
}

describe("ZK proof in contract", () => {
    before("Check zkey exists", async () => {
        let res = await checkPathExists("hasher.zkey");
        if (!res) {
            throw new Error("hasher.zkey is required, generate zkey first");
        }
    });
    before("Check circuit exists", async () => {
        let res = await checkPathExists(path.join("build", "hasher.r1cs"));
        if (!res) {
            throw new Error("build/hasher.r1cs is required, compile circuit first");
        }
    });

    // Sample input
    const msg = "klay";
    const input = {"msg": msg.split('').map(ch => {
        return ch.charCodeAt(0).toString();
    })};

    const wtns = {type: "mem"};
    let proofA, proofB, proofC, pubSig;

    it("Generate and verify proof", async () => {
        // Calculate witness
        await snark.wtns.calculate(input, path.join("build", "hasher_js", "hasher.wasm"), wtns);

        // Generate proof
        const {proof: proof, publicSignals: publicSignals} = await snark.groth16.prove("hasher.zkey", wtns);

        // Save proof for later verification in contract
        proofA = [proof.pi_a[0], proof.pi_a[1]];
        proofB = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
        proofC = [proof.pi_c[0], proof.pi_c[1]];
        pubSig = publicSignals;

        // Verify proof
        const vKey = await snark.zKey.exportVerificationKey("hasher.zkey");
        const res = await snark.groth16.verify(vKey, publicSignals, proof);
        assert(res == true);
    });

    it("Deploy verifier contract and verify ZK proof in contract", async () => {
        const templates = {};
        templates.groth16 = fs.readFileSync(path.join("contracts", "verifier_groth16.sol.ejs"), "utf8");

        const verifierCode = await snark.zKey.exportSolidityVerifier("hasher.zkey", templates);
        const solidityVerifierFilename = path.join("contracts", "groth16.sol");
        fs.writeFileSync(solidityVerifierFilename, verifierCode, "utf-8");

        // Compile the groth16 verifier smart contract
        await hardhat.run("compile");

        // Deploy verifier contracts
        const ZKFactory = await hardhat.ethers.getContractFactory("Groth16Verifier");
        zkContract = await ZKFactory.deploy();

        // Verify proof in contract
        let result = await zkContract.verifyProof(proofA, proofB, proofC, pubSig);
        assert(result == true);
    });
});
