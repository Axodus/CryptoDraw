// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract BandMock {
    struct ReferenceData {
        uint256 rate;
        uint256 lastUpdatedBase;
        uint256 lastUpdatedQuote;
    }

    uint256 public price = 2000000000000000000; // 2 * 1e18

    function setPrice(uint256 p) external {
        price = p;
    }

    function getReferenceData(string calldata /* base */, string calldata /* quote */)
        external
        view
        returns (ReferenceData memory)
    {
        return ReferenceData({rate: price, lastUpdatedBase: block.timestamp, lastUpdatedQuote: block.timestamp});
    }
}
