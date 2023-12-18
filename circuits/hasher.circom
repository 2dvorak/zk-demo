pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/sha256/sha256.circom";
include "../node_modules/circomlib/circuits/bitify.circom";

/*This circuit template takes n byte array then calculate SHA256 hash of the input.*/

template Hasher (len) {

    // Input and output signals
    signal input msg[len];
    signal output hash[2];

    // Intermediate signal to convet byte array to bit array
    signal msgBits[len*8];
    component msg2Bits[len];
    for (var i = 0; i < len; i++) {
        // Num2Bits is a circomlib template to convert a number to bit array
        msg2Bits[i] = Num2Bits(8);
        msg2Bits[i].in <== msg[i];
        for (var j = 0; j < 8; j++) {
            // Endianess
            msgBits[i*8 + j] <== msg2Bits[i].out[7 - j];
        }
    }

    // Calculate hash
    // Sha256 is a circomlib template to calcuate sha256 hash of bit array. Output is in bit array too (256 bits)
    component sha256 = Sha256(len*8);
    sha256.in <== msgBits;

    // Set output
    component hashBits2Num[2];
    for (var i = 0; i < 2; i++) {
        // Bits2Num is a circomlib template to convert bit array to a number
        hashBits2Num[i] = Bits2Num(128);
        for (var j = 0; j < 128; j++) {
            hashBits2Num[i].in[j] <== sha256.out[128 * i + 127 - j];
        }
        hash[i] <== hashBits2Num[i].out;
    }
}

component main = Hasher(4);
