// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

contract TicketNFT is ERC721, Ownable, ERC721Burnable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    address public cryptoDrawAddress;

    struct Ticket {
        address player;
        uint8[] chosenNumbers;
        uint256 drawRound; // Store draw round info
    }

    mapping(uint256 => Ticket) private _tickets;

    event TicketMinted(address indexed to, uint256 tokenId, uint256 drawRound);
    event TicketBurned(uint256 tokenId);

    constructor() ERC721("TicketNFT", "TNFT") {}

    function setCryptoDrawAddress(address _cryptoDrawAddress) external onlyOwner {
        cryptoDrawAddress = _cryptoDrawAddress;
    }

    function burn(uint256 tokenId) public override {
        require(msg.sender == cryptoDrawAddress, "Only CryptoDraw contract can burn tokens");
        super.burn(tokenId);
        emit TicketBurned(tokenId);
    }

    function mint(address to, uint8[] memory _chosenNumbers, uint256 _drawRound) external onlyOwner returns (uint256) {
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);

        _tickets[tokenId] = Ticket({
            player: to,
            chosenNumbers: _chosenNumbers,
            drawRound: _drawRound
        });

        emit TicketMinted(to, tokenId, _drawRound);

        return tokenId;
    }

    function getTicket(uint256 tokenId) external view returns (address player, uint8[] memory chosenNumbers, uint256 drawRound) {
        require(_exists(tokenId), "TicketNFT: query for nonexistent token");

        Ticket memory ticket = _tickets[tokenId];
        return (ticket.player, ticket.chosenNumbers, ticket.drawRound);
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        require(_exists(tokenId), "TicketNFT: URI query for nonexistent token");

        // Generate the token name as "#123456789"
        string memory tokenName = string(abi.encodePacked("#", uint2str(tokenId)));
        
        // Generate a custom image URL
        string memory imageURL = string(abi.encodePacked("https://example.com/images/", uint2str(tokenId), ".png"));

        // Construct the token metadata
        string memory metadata = string(abi.encodePacked(
            '{"name": "', tokenName, '",',
            '"description": "Ticket NFT for CryptoDraw. Draw round: ', uint2str(_tickets[tokenId].drawRound), '",',
            '"image": "', imageURL, '"}'
        ));

        // Return the metadata URL (using a data URI scheme here for simplicity)
        return string(abi.encodePacked("data:application/json;base64,", base64Encode(bytes(metadata))));
    }

    // Helper function to convert uint to string
    function uint2str(uint256 _i) internal pure returns (string memory _uintAsString) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        return string(bstr);
    }

    // Base64 encoding of the JSON metadata
    string internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function base64Encode(bytes memory input) internal pure returns (string memory) {
        uint256 inputLength = input.length;
        uint256 outputLength = 4 * ((inputLength + 2) / 3);
        bytes memory result = new bytes(outputLength);
        bytes memory table = bytes(TABLE);

        uint256 i = 0;
        uint256 j = 0;
        while (i < inputLength) {
            uint256 a = uint8(input[i++]);
            uint256 b = i < inputLength ? uint8(input[i++]) : 0;
            uint256 c = i < inputLength ? uint8(input[i++]) : 0;

            uint256 index0 = a >> 2;
            uint256 index1 = ((a & 0x03) << 4) | (b >> 4);
            uint256 index2 = ((b & 0x0F) << 2) | (c >> 6);
            uint256 index3 = c & 0x3F;

            result[j++] = table[index0];
            result[j++] = table[index1];
            result[j++] = index2 < 64 ? table[index2] : bytes1('=');
            result[j++] = index3 < 64 ? table[index3] : bytes1('=');
        }

        return string(result);
    }

}
