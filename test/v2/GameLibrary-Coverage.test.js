/**
 * @title GameLibrary Coverage Tests
 * @dev Tests for number validation and packing/unpacking edge cases
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GameLibrary - Coverage Tests", function () {
    let gameLibrary;

    beforeEach(async function () {
        const GameLibrary = await ethers.getContractFactory("GameLibrary");
        gameLibrary = await GameLibrary.deploy();
    });

    describe("SuperSeven Number Validation", function () {
        it("should validate correct SuperSeven numbers", async function () {
            expect(await gameLibrary.validateSuperSevenNumbers([0, 1, 2, 3, 4, 5, 6])).to.be.true;
            expect(await gameLibrary.validateSuperSevenNumbers([9, 8, 7, 6, 5, 4, 3])).to.be.true;
            expect(await gameLibrary.validateSuperSevenNumbers([0, 0, 0, 0, 0, 0, 0])).to.be.true; // Duplicates allowed
        });

        it("should reject invalid SuperSeven numbers - wrong count", async function () {
            expect(await gameLibrary.validateSuperSevenNumbers([0, 1, 2, 3, 4, 5])).to.be.false; // 6 numbers
            expect(await gameLibrary.validateSuperSevenNumbers([0, 1, 2, 3, 4, 5, 6, 7])).to.be.false; // 8 numbers
            expect(await gameLibrary.validateSuperSevenNumbers([])).to.be.false; // Empty
        });

        it("should reject invalid SuperSeven numbers - out of range", async function () {
            expect(await gameLibrary.validateSuperSevenNumbers([0, 1, 2, 3, 4, 5, 10])).to.be.false; // 10 > 9
            expect(await gameLibrary.validateSuperSevenNumbers([255, 1, 2, 3, 4, 5, 6])).to.be.false; // 255 > 9
        });

        it("should handle edge values", async function () {
            expect(await gameLibrary.validateSuperSevenNumbers([9, 9, 9, 9, 9, 9, 9])).to.be.true; // All max
            expect(await gameLibrary.validateSuperSevenNumbers([0, 0, 0, 0, 0, 0, 0])).to.be.true; // All min
        });
    });

    describe("EasyLotto Number Validation", function () {
        it("should validate correct EasyLotto numbers", async function () {
            const validNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
            expect(await gameLibrary.validateEasyLottoNumbers(validNumbers)).to.be.true;

            const validNumbers2 = [25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11];
            expect(await gameLibrary.validateEasyLottoNumbers(validNumbers2)).to.be.true;
        });

        it("should reject invalid EasyLotto numbers - wrong count", async function () {
            const tooFew = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 14 numbers
            expect(await gameLibrary.validateEasyLottoNumbers(tooFew)).to.be.false;

            const tooMany = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]; // 16 numbers
            expect(await gameLibrary.validateEasyLottoNumbers(tooMany)).to.be.false;

            expect(await gameLibrary.validateEasyLottoNumbers([])).to.be.false; // Empty
        });

        it("should reject invalid EasyLotto numbers - out of range", async function () {
            const withZero = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]; // 0 is invalid
            expect(await gameLibrary.validateEasyLottoNumbers(withZero)).to.be.false;

            const withTooHigh = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 26]; // 26 > 25
            expect(await gameLibrary.validateEasyLottoNumbers(withTooHigh)).to.be.false;
        });

        it("should reject duplicate numbers", async function () {
            const withDuplicate = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 1]; // Duplicate 1
            expect(await gameLibrary.validateEasyLottoNumbers(withDuplicate)).to.be.false;

            const allSame = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
            expect(await gameLibrary.validateEasyLottoNumbers(allSame)).to.be.false;
        });

        it("should handle edge valid cases", async function () {
            const minNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
            expect(await gameLibrary.validateEasyLottoNumbers(minNumbers)).to.be.true;

            const maxNumbers = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
            expect(await gameLibrary.validateEasyLottoNumbers(maxNumbers)).to.be.true;
        });
    });

    describe("SuperSeven Number Packing", function () {
        it("should pack and unpack SuperSeven numbers correctly", async function () {
            const numbers = [1, 2, 3, 4, 5, 6, 7];
            const packed = await gameLibrary.packSuperSevenNumbers(numbers);
            const unpacked = await gameLibrary.unpackSuperSevenNumbers(packed);
            
            expect(unpacked).to.deep.equal(numbers);
        });

        it("should handle all zeros", async function () {
            const numbers = [0, 0, 0, 0, 0, 0, 0];
            const packed = await gameLibrary.packSuperSevenNumbers(numbers);
            const unpacked = await gameLibrary.unpackSuperSevenNumbers(packed);
            
            expect(unpacked).to.deep.equal(numbers);
            expect(packed).to.equal(0);
        });

        it("should handle all nines", async function () {
            const numbers = [9, 9, 9, 9, 9, 9, 9];
            const packed = await gameLibrary.packSuperSevenNumbers(numbers);
            const unpacked = await gameLibrary.unpackSuperSevenNumbers(packed);
            
            expect(unpacked).to.deep.equal(numbers);
        });

        it("should handle mixed patterns", async function () {
            const testCases = [
                [0, 1, 2, 3, 4, 5, 6],
                [9, 8, 7, 6, 5, 4, 3],
                [0, 9, 0, 9, 0, 9, 0],
                [1, 1, 1, 1, 1, 1, 1],
                [5, 5, 5, 5, 5, 5, 5]
            ];

            for (const numbers of testCases) {
                const packed = await gameLibrary.packSuperSevenNumbers(numbers);
                const unpacked = await gameLibrary.unpackSuperSevenNumbers(packed);
                expect(unpacked).to.deep.equal(numbers);
            }
        });

        it("should produce different packed values for different inputs", async function () {
            const numbers1 = [1, 2, 3, 4, 5, 6, 7];
            const numbers2 = [7, 6, 5, 4, 3, 2, 1];
            
            const packed1 = await gameLibrary.packSuperSevenNumbers(numbers1);
            const packed2 = await gameLibrary.packSuperSevenNumbers(numbers2);
            
            expect(packed1).to.not.equal(packed2);
        });
    });

    describe("EasyLotto Number Packing", function () {
        it("should pack and unpack EasyLotto numbers correctly", async function () {
            const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
            const packed = await gameLibrary.packEasyLottoNumbers(numbers);
            const unpacked = await gameLibrary.unpackEasyLottoNumbers(packed);
            
            expect(unpacked.length).to.equal(15);
            expect(unpacked.sort((a, b) => a - b)).to.deep.equal(numbers);
        });

        it("should handle minimum valid numbers", async function () {
            const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
            const packed = await gameLibrary.packEasyLottoNumbers(numbers);
            const unpacked = await gameLibrary.unpackEasyLottoNumbers(packed);
            
            expect(unpacked.sort((a, b) => a - b)).to.deep.equal(numbers);
        });

        it("should handle maximum valid numbers", async function () {
            const numbers = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
            const packed = await gameLibrary.packEasyLottoNumbers(numbers);
            const unpacked = await gameLibrary.unpackEasyLottoNumbers(packed);
            
            expect(unpacked.sort((a, b) => a - b)).to.deep.equal(numbers);
        });

        it("should handle mixed order input", async function () {
            const numbers = [25, 1, 15, 8, 3, 20, 7, 12, 5, 18, 2, 22, 9, 14, 6];
            const sorted = [...numbers].sort((a, b) => a - b);
            
            const packed = await gameLibrary.packEasyLottoNumbers(numbers);
            const unpacked = await gameLibrary.unpackEasyLottoNumbers(packed);
            
            expect(unpacked.sort((a, b) => a - b)).to.deep.equal(sorted);
        });

        it("should produce different packed values for different selections", async function () {
            const numbers1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
            const numbers2 = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
            
            const packed1 = await gameLibrary.packEasyLottoNumbers(numbers1);
            const packed2 = await gameLibrary.packEasyLottoNumbers(numbers2);
            
            expect(packed1).to.not.equal(packed2);
        });
    });

    describe("Bit Manipulation Edge Cases", function () {
        it("should handle maximum packed values correctly", async function () {
            // For SuperSeven: 7 digits, each can be 0-9, packed as 4 bits each
            // Maximum would be [9,9,9,9,9,9,9]
            const maxSuperSeven = [9, 9, 9, 9, 9, 9, 9];
            const packed = await gameLibrary.packSuperSevenNumbers(maxSuperSeven);
            
            // Should not overflow uint32
            expect(packed).to.be.lt(ethers.BigNumber.from(2).pow(32));
            
            const unpacked = await gameLibrary.unpackSuperSevenNumbers(packed);
            expect(unpacked).to.deep.equal(maxSuperSeven);
        });

        it("should handle EasyLotto bit packing limits", async function () {
            // EasyLotto uses bitmap for 25 numbers, should fit in uint32
            const allNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
            const fifteenNumbers = allNumbers.slice(0, 15);
            
            const packed = await gameLibrary.packEasyLottoNumbers(fifteenNumbers);
            
            // Should not overflow uint32
            expect(packed).to.be.lt(ethers.BigNumber.from(2).pow(32));
        });
    });

    describe("Gas Optimization Tests", function () {
        it("should be gas efficient for common operations", async function () {
            const numbers = [1, 2, 3, 4, 5, 6, 7];
            
            // Test packing gas usage
            const packTx = await gameLibrary.packSuperSevenNumbers(numbers);
            const packReceipt = await packTx.wait();
            
            // Should be reasonable gas (adjust threshold as needed)
            expect(packReceipt.gasUsed).to.be.lt(100000);
            
            // Test unpacking gas usage
            const packed = await gameLibrary.packSuperSevenNumbers(numbers);
            const unpackTx = await gameLibrary.unpackSuperSevenNumbers(packed);
            
            // View function, should be very efficient
            expect(unpackTx).to.not.be.reverted;
        });
    });

    describe("Error Handling", function () {
        it("should handle invalid packed data gracefully", async function () {
            // Test with maximum uint32 value
            const maxUint32 = ethers.BigNumber.from(2).pow(32).sub(1);
            
            // Should not revert, but might produce unexpected results
            await expect(
                gameLibrary.unpackSuperSevenNumbers(maxUint32)
            ).to.not.be.reverted;
            
            await expect(
                gameLibrary.unpackEasyLottoNumbers(maxUint32)
            ).to.not.be.reverted;
        });

        it("should handle zero packed values", async function () {
            const superSevenUnpacked = await gameLibrary.unpackSuperSevenNumbers(0);
            expect(superSevenUnpacked).to.deep.equal([0, 0, 0, 0, 0, 0, 0]);
            
            const easyLottoUnpacked = await gameLibrary.unpackEasyLottoNumbers(0);
            expect(easyLottoUnpacked).to.deep.equal([]);
        });
    });

    describe("Consistency Tests", function () {
        it("should maintain consistency across multiple pack/unpack cycles", async function () {
            const testNumbers = [
                [0, 1, 2, 3, 4, 5, 6],
                [9, 8, 7, 6, 5, 4, 3],
                [1, 1, 1, 1, 1, 1, 1],
                [0, 9, 0, 9, 0, 9, 0]
            ];

            for (const numbers of testNumbers) {
                let currentNumbers = [...numbers];
                
                // Pack and unpack multiple times
                for (let i = 0; i < 5; i++) {
                    const packed = await gameLibrary.packSuperSevenNumbers(currentNumbers);
                    currentNumbers = await gameLibrary.unpackSuperSevenNumbers(packed);
                }
                
                expect(currentNumbers).to.deep.equal(numbers);
            }
        });

        it("should maintain EasyLotto consistency with different orderings", async function () {
            const baseNumbers = [1, 5, 10, 15, 20, 8, 12, 3, 18, 25, 2, 7, 13, 16, 22];
            const shuffled1 = [25, 1, 15, 8, 3, 20, 7, 12, 5, 18, 2, 22, 10, 16, 13];
            const shuffled2 = [22, 16, 10, 13, 2, 18, 5, 12, 7, 20, 3, 8, 15, 1, 25];

            const packed1 = await gameLibrary.packEasyLottoNumbers(baseNumbers);
            const packed2 = await gameLibrary.packEasyLottoNumbers(shuffled1);
            const packed3 = await gameLibrary.packEasyLottoNumbers(shuffled2);

            // All should produce the same packed value (order doesn't matter)
            expect(packed1).to.equal(packed2);
            expect(packed2).to.equal(packed3);

            // Unpacking should give same set of numbers (possibly different order)
            const unpacked1 = await gameLibrary.unpackEasyLottoNumbers(packed1);
            const unpacked2 = await gameLibrary.unpackEasyLottoNumbers(packed2);
            const unpacked3 = await gameLibrary.unpackEasyLottoNumbers(packed3);

            const sorted = baseNumbers.sort((a, b) => a - b);
            expect(unpacked1.sort((a, b) => a - b)).to.deep.equal(sorted);
            expect(unpacked2.sort((a, b) => a - b)).to.deep.equal(sorted);
            expect(unpacked3.sort((a, b) => a - b)).to.deep.equal(sorted);
        });
    });
});