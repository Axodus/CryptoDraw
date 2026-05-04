// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface ITicketNFT {
    function decrementRounds(uint256 tokenId) external;
    function updateStatus(uint256 tokenId, uint8 newStatus) external;
    function burn(uint256 tokenId) external;
}

contract TestTicketNFCCaller {
    address public ticketNFT;
    constructor(address _ticketNFT) {
        ticketNFT = _ticketNFT;
    }

    function callDecrement(uint256 tokenId) external {
        ITicketNFT(ticketNFT).decrementRounds(tokenId);
    }

    function callUpdate(uint256 tokenId, uint8 status) external {
        ITicketNFT(ticketNFT).updateStatus(tokenId, status);
    }

    function callBurn(uint256 tokenId) external {
        ITicketNFT(ticketNFT).burn(tokenId);
    }
}
