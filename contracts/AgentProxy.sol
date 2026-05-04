// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./CryptoDraw.sol";

contract AgentProxy {
    CryptoDraw public cryptoDraw;

    constructor(address _cryptoDrawAddress) {
        cryptoDraw = CryptoDraw(_cryptoDrawAddress);
    }

    function purchaseTicket(uint8[] calldata _chosenNumbers) external {
        require(cryptoDraw.agents(msg.sender), "Not an authorized agent");
        cryptoDraw.purchaseTicket(_chosenNumbers, msg.sender);
    }
}
