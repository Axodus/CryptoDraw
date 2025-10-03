// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "../GameLibrary.sol";

/**
 * @title GameLibraryWrapper
 * @dev Wrapper contract to expose internal GameLibrary functions for testing
 */
contract GameLibraryWrapper {
    using GameLibrary for *;

    // EasyLotto functions
    function validateEasyLottoNumbers(uint8[] memory numbers) 
        external 
        pure 
        returns (bool valid) 
    {
        return GameLibrary.validateEasyLottoNumbers(numbers);
    }

    function packEasyLottoNumbers(uint8[] memory numbers) 
        external 
        pure 
        returns (uint32 packed) 
    {
        return GameLibrary.packEasyLottoNumbers(numbers);
    }

    function unpackEasyLottoNumbers(uint32 packed) 
        external 
        pure 
        returns (uint8[] memory numbers) 
    {
        return GameLibrary.unpackEasyLottoNumbers(packed);
    }

    function countEasyLottoMatches(uint32 packed1, uint32 packed2) 
        external 
        pure 
        returns (uint8 count) 
    {
        return GameLibrary.countEasyLottoMatches(packed1, packed2);
    }

    // SuperSeven functions
    function validateSuperSevenNumbers(uint8[] memory columns) 
        external 
        pure 
        returns (bool valid) 
    {
        return GameLibrary.validateSuperSevenNumbers(columns);
    }

    function packSuperSevenNumbers(uint8[] memory columns) 
        external 
        pure 
        returns (uint32 packed) 
    {
        return GameLibrary.packSuperSevenNumbers(columns);
    }

    function unpackSuperSevenNumbers(uint32 packed) 
        external 
        pure 
        returns (uint8[] memory columns) 
    {
        return GameLibrary.unpackSuperSevenNumbers(packed);
    }

    function countSuperSevenMatches(uint32 packed1, uint32 packed2) 
        external 
        pure 
        returns (uint8 count) 
    {
        return GameLibrary.countSuperSevenMatches(packed1, packed2);
    }

    // Constants getters
    function getEasyLottoConstants() 
        external 
        pure 
        returns (uint8 minNumbers, uint8 maxNumbers, uint8 minValue, uint8 maxValue) 
    {
        return (
            GameLibrary.EASYLOTTO_MIN_NUMBERS,
            GameLibrary.EASYLOTTO_MAX_NUMBERS,
            GameLibrary.EASYLOTTO_MIN_VALUE,
            GameLibrary.EASYLOTTO_MAX_VALUE
        );
    }

    function getSuperSevenConstants() 
        external 
        pure 
        returns (uint8 columns, uint8 minValue, uint8 maxValue) 
    {
        return (
            GameLibrary.SUPERSEVEN_COLUMNS,
            GameLibrary.SUPERSEVEN_MIN_VALUE,
            GameLibrary.SUPERSEVEN_MAX_VALUE
        );
    }
}