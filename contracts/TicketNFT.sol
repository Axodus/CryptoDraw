// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

/**
 * @title TicketNFT
 * @dev NFT não-transferível representando tickets da loteria CryptoDraw
 * @notice Suporta dois tipos de jogos: SuperSete e EasyLotto (Lotofácil)
 */
contract TicketNFT is ERC721, Ownable, ERC721Burnable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // ============ ERRORS ============
    
    error OnlyCryptoDrawContract();
    error TokenNotExists();
    error TransferNotAllowed();
    
    // ============ ENUMS ============
    
    enum GameType {
        SUPERSETE,    // 0: SuperSete (7 colunas, 0-9)
        EASYLOTTO     // 1: EasyLotto/Lotofácil (15 números de 1-25)
    }
    
    enum TicketStatus {
        ACTIVE,       // 0: Ticket ativo
        EXPIRED,      // 1: Ticket expirado
        REDEEMED,     // 2: Prêmio resgatado
        BURNED        // 3: Ticket queimado
    }

    // ============ STRUCTS ============
    
    /**
     * @dev Estrutura de dados do ticket
     * @param player Endereço do jogador
     * @param game Tipo de jogo
     * @param numbersPacked Números escolhidos em formato compacto (uint32)
     * @param drawRound Round do sorteio
     * @param roundsBought Quantidade de rodadas compradas (1-6)
     * @param roundsRemaining Rodadas restantes
     * @param createdAt Timestamp de criação
     * @param status Status do ticket
     */
    struct Ticket {
        address player;
        GameType game;
        uint32 numbersPacked;
        uint256 drawRound;
        uint8 roundsBought;
        uint8 roundsRemaining;
        uint256 createdAt;
        TicketStatus status;
    }

    // ============ STATE VARIABLES ============
    
    address public cryptoDrawAddress;
    
    mapping(uint256 => Ticket) private _tickets;

    // ============ EVENTS ============
    
    event TicketMinted(
        address indexed to, 
        uint256 indexed tokenId, 
        GameType game,
        uint256 drawRound,
        uint8 rounds
    );
    
    event TicketBurned(uint256 indexed tokenId);
    
    event TicketStatusUpdated(
        uint256 indexed tokenId,
        TicketStatus oldStatus,
        TicketStatus newStatus
    );

    // ============ CONSTRUCTOR ============
    
    constructor() ERC721("CryptoDraw Ticket", "CDRAW") {}

    // ============ MODIFIERS ============
    
    modifier onlyCryptoDraw() {
        if (msg.sender != cryptoDrawAddress) revert OnlyCryptoDrawContract();
        _;
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @dev Define o endereço do contrato CryptoDraw
     * @param _cryptoDrawAddress Endereço do contrato principal
     */
    function setCryptoDrawAddress(address _cryptoDrawAddress) external onlyOwner {
        require(_cryptoDrawAddress != address(0), "Invalid address");
        cryptoDrawAddress = _cryptoDrawAddress;
    }

    // ============ EXTERNAL FUNCTIONS ============
    
    /**
     * @dev Cria um novo ticket NFT
     * @param to Endereço do destinatário
     * @param game Tipo de jogo
     * @param numbersPacked Números em formato compacto
     * @param drawRound Round do sorteio
     * @param rounds Quantidade de rodadas
     * @return tokenId ID do token criado
     */
    function mint(
        address to,
        GameType game,
        uint32 numbersPacked,
        uint256 drawRound,
        uint8 rounds
    ) external onlyCryptoDraw returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(rounds >= 1 && rounds <= 6, "Invalid rounds count");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);

        _tickets[tokenId] = Ticket({
            player: to,
            game: game,
            numbersPacked: numbersPacked,
            drawRound: drawRound,
            roundsBought: rounds,
            roundsRemaining: rounds,
            createdAt: block.timestamp,
            status: TicketStatus.ACTIVE
        });

        emit TicketMinted(to, tokenId, game, drawRound, rounds);

        return tokenId;
    }
    
    /**
     * @dev Queima um ticket
     * @param tokenId ID do token a ser queimado
     */
    function burn(uint256 tokenId) public override onlyCryptoDraw {
        _updateTicketStatus(tokenId, TicketStatus.BURNED);
        super.burn(tokenId);
        emit TicketBurned(tokenId);
    }
    
    /**
     * @dev Atualiza o status do ticket
     * @param tokenId ID do token
     * @param newStatus Novo status
     */
    function updateStatus(uint256 tokenId, TicketStatus newStatus) 
        external 
        onlyCryptoDraw 
    {
        _updateTicketStatus(tokenId, newStatus);
    }
    
    /**
     * @dev Decrementa rodadas restantes do ticket
     * @param tokenId ID do token
     */
    function decrementRounds(uint256 tokenId) external onlyCryptoDraw {
        if (!_exists(tokenId)) revert TokenNotExists();
        
        Ticket storage ticket = _tickets[tokenId];
        require(ticket.roundsRemaining > 0, "No rounds remaining");
        
        ticket.roundsRemaining--;
        
        // Auto-expirar se não tiver mais rodadas
        if (ticket.roundsRemaining == 0 && ticket.status == TicketStatus.ACTIVE) {
            _updateTicketStatus(tokenId, TicketStatus.EXPIRED);
        }
    }

    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Retorna os dados completos de um ticket
     * @param tokenId ID do token
     * @return ticket Estrutura Ticket completa
     */
    function getTicket(uint256 tokenId) 
        external 
        view 
        returns (Ticket memory ticket) 
    {
        if (!_exists(tokenId)) revert TokenNotExists();
        return _tickets[tokenId];
    }
    
    /**
     * @dev Retorna dados básicos de um ticket
     * @param tokenId ID do token
     */
    function getTicketBasic(uint256 tokenId) 
        external 
        view 
        returns (
            address player,
            GameType game,
            uint32 numbersPacked,
            uint256 drawRound
        ) 
    {
        if (!_exists(tokenId)) revert TokenNotExists();
        Ticket memory ticket = _tickets[tokenId];
        return (ticket.player, ticket.game, ticket.numbersPacked, ticket.drawRound);
    }
    
    /**
     * @dev Verifica se um ticket está ativo
     * @param tokenId ID do token
     * @return isActive Se o ticket está ativo
     */
    function isTicketActive(uint256 tokenId) external view returns (bool) {
        if (!_exists(tokenId)) return false;
        return _tickets[tokenId].status == TicketStatus.ACTIVE && 
               _tickets[tokenId].roundsRemaining > 0;
    }
    
    /**
     * @dev Retorna o status de um ticket
     * @param tokenId ID do token
     * @return status Status do ticket
     */
    function getTicketStatus(uint256 tokenId) 
        external 
        view 
        returns (TicketStatus) 
    {
        if (!_exists(tokenId)) revert TokenNotExists();
        return _tickets[tokenId].status;
    }

    /**
     * @dev Retorna metadata URI do token
     * @param tokenId ID do token
     * @return URI com metadata JSON
     */
    function tokenURI(uint256 tokenId) 
        public 
        view 
        virtual 
        override 
        returns (string memory) 
    {
        if (!_exists(tokenId)) revert TokenNotExists();

        Ticket memory ticket = _tickets[tokenId];
        
        string memory gameName = ticket.game == GameType.SUPERSETE ? "SuperSete" : "EasyLotto";
        string memory statusName = _getStatusName(ticket.status);
        
        // Gera o nome do token como "#123456789"
        string memory tokenName = string(abi.encodePacked("#", _uint2str(tokenId)));
        
        // URL da imagem customizada
        string memory imageURL = string(
            abi.encodePacked(
                "https://cryptodraw.io/images/",
                gameName,
                "/",
                _uint2str(tokenId),
                ".png"
            )
        );

        // Constrói metadata JSON
        string memory metadata = string(
            abi.encodePacked(
                '{"name": "', tokenName, '",',
                '"description": "CryptoDraw ', gameName, ' Ticket - Draw #', _uint2str(ticket.drawRound), '",',
                '"image": "', imageURL, '",',
                '"attributes": [',
                    '{"trait_type": "Game", "value": "', gameName, '"},',
                    '{"trait_type": "Draw Round", "value": ', _uint2str(ticket.drawRound), '},',
                    '{"trait_type": "Rounds Bought", "value": ', _uint2str(uint256(ticket.roundsBought)), '},',
                    '{"trait_type": "Rounds Remaining", "value": ', _uint2str(uint256(ticket.roundsRemaining)), '},',
                    '{"trait_type": "Status", "value": "', statusName, '"}',
                ']}'
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", _base64Encode(bytes(metadata))));
    }

    // ============ INTERNAL FUNCTIONS ============
    
    /**
     * @dev Atualiza o status interno do ticket
     */
    function _updateTicketStatus(uint256 tokenId, TicketStatus newStatus) internal {
        if (!_exists(tokenId)) revert TokenNotExists();
        
        TicketStatus oldStatus = _tickets[tokenId].status;
        _tickets[tokenId].status = newStatus;
        
        emit TicketStatusUpdated(tokenId, oldStatus, newStatus);
    }
    
    /**
     * @dev Retorna o nome do status
     */
    function _getStatusName(TicketStatus status) internal pure returns (string memory) {
        if (status == TicketStatus.ACTIVE) return "Active";
        if (status == TicketStatus.EXPIRED) return "Expired";
        if (status == TicketStatus.REDEEMED) return "Redeemed";
        return "Burned";
    }

    /**
     * @dev Override para desabilitar transferências (soulbound)
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // Permite mint (from == 0) e burn (to == 0), mas não transferências
        if (from != address(0) && to != address(0)) {
            revert TransferNotAllowed();
        }
    }

    // ============ HELPER FUNCTIONS ============
    
    /**
     * @dev Converte uint para string
     */
    function _uint2str(uint256 _i) internal pure returns (string memory) {
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

    /**
     * @dev Codifica bytes em base64
     */
    string internal constant TABLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    function _base64Encode(bytes memory input) internal pure returns (string memory) {
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

