// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../GameLibrary.sol";

contract TestGameLibCaller {
    using GameLibrary for uint8[];

    function validateEasy(uint8[] memory numbers) external pure returns (bool) {
        return GameLibrary.validateEasyLottoNumbers(numbers);
    }

    function packEasy(uint8[] memory numbers) external pure returns (uint32) {
        return GameLibrary.packEasyLottoNumbers(numbers);
    }

    function unpackEasy(uint32 packed) external pure returns (uint8[] memory) {
        return GameLibrary.unpackEasyLottoNumbers(packed);
    }

    function countEasy(uint32 a, uint32 b) external pure returns (uint8) {
        return GameLibrary.countEasyLottoMatches(a, b);
    }

    function validateSuper(uint8[] memory cols) external pure returns (bool) {
        return GameLibrary.validateSuperSevenNumbers(cols);
    }

    function packSuper(uint8[] memory cols) external pure returns (uint32) {
        return GameLibrary.packSuperSevenNumbers(cols);
    }

    function unpackSuper(uint32 packed) external pure returns (uint8[] memory) {
        return GameLibrary.unpackSuperSevenNumbers(packed);
    }

    function countSuper(uint32 a, uint32 b) external pure returns (uint8) {
        return GameLibrary.countSuperSevenMatches(a, b);
    }

    function genEasy(uint256 randomness, uint32 drawId) external pure returns (uint32) {
        return GameLibrary.generateEasyLottoWinning(randomness, drawId);
    }

    function genSuper(uint256 randomness, uint32 drawId) external pure returns (uint32) {
        return GameLibrary.generateSuperSevenWinning(randomness, drawId);
    }
}
