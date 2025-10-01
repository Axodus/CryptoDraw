// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PriceOracle
 * @dev Oracle de preços para conversão USD no sistema CryptoDraw
 * @notice Implementa conversão de tokens para USD com proteções de segurança
 */
contract PriceOracle is Ownable, ReentrancyGuard {
    
    // ============ ERRORS ============
    
    error TokenNotSupported(address token);
    error InvalidPrice(uint256 price);
    error StalePrice(uint256 lastUpdate, uint256 maxAge);
    error ZeroAmount();
    error ZeroAddress();
    
    // ============ EVENTS ============
    
    /**
     * @dev Emitido quando um preço é atualizado
     * @param token Endereço do token
     * @param price Novo preço em USD (18 decimais)
     * @param timestamp Timestamp da atualização
     */
    event PriceUpdated(address indexed token, uint256 price, uint256 timestamp);
    
    /**
     * @dev Emitido quando um token é adicionado/removido do suporte
     * @param token Endereço do token
     * @param supported Se o token está suportado
     */
    event TokenSupportUpdated(address indexed token, bool supported);
    
    // ============ STRUCTS ============
    
    /**
     * @dev Estrutura para armazenar dados de preço
     * @param price Preço em USD com 18 decimais
     * @param lastUpdate Timestamp da última atualização
     * @param decimals Decimais do token
     * @param supported Se o token está ativo
     */
    struct PriceData {
        uint256 price;          // Preço USD com 18 decimais
        uint256 lastUpdate;     // Timestamp última atualização
        uint8 decimals;         // Decimais do token
        bool supported;         // Token suportado
    }
    
    // ============ STATE VARIABLES ============
    
    /// @dev Mapping de token para dados de preço
    mapping(address => PriceData) public priceData;
    
    /// @dev Lista de tokens suportados
    address[] public supportedTokens;
    
    /// @dev Idade máxima do preço em segundos (1 hora padrão)
    uint256 public maxPriceAge = 3600;
    
    /// @dev Endereço ONE nativo (0x0)
    address public constant NATIVE_ONE = address(0);
    
    // ============ MODIFIERS ============
    
    /**
     * @dev Verifica se o token é suportado
     * @param token Endereço do token a verificar
     */
    modifier onlySupportedToken(address token) {
        if (!priceData[token].supported) {
            revert TokenNotSupported(token);
        }
        _;
    }
    
    /**
     * @dev Verifica se o preço não está desatualizado
     * @param token Endereço do token a verificar
     */
    modifier notStale(address token) {
        PriceData memory data = priceData[token];
        if (block.timestamp - data.lastUpdate > maxPriceAge) {
            revert StalePrice(data.lastUpdate, maxPriceAge);
        }
        _;
    }
    
    // ============ CONSTRUCTOR ============
    
    /**
     * @dev Inicializa o oracle com ONE nativo
     * @param initialOnePrice Preço inicial do ONE em USD (18 decimais)
     */
    constructor(uint256 initialOnePrice) {
        if (initialOnePrice == 0) revert InvalidPrice(initialOnePrice);
        
        // Configurar ONE nativo
        priceData[NATIVE_ONE] = PriceData({
            price: initialOnePrice,
            lastUpdate: block.timestamp,
            decimals: 18,
            supported: true
        });
        
        supportedTokens.push(NATIVE_ONE);
        emit PriceUpdated(NATIVE_ONE, initialOnePrice, block.timestamp);
        emit TokenSupportUpdated(NATIVE_ONE, true);
    }
    
    // ============ EXTERNAL FUNCTIONS ============
    
    /**
     * @dev Retorna o preço atual em USD de um token
     * @param token Endereço do token (0x0 para ONE nativo)
     * @return price Preço em USD com 18 decimais
     */
    function getUSDPrice(address token) 
        external 
        view 
        onlySupportedToken(token) 
        notStale(token)
        returns (uint256 price) 
    {
        return priceData[token].price;
    }
    
    /**
     * @dev Converte quantidade de token para valor USD
     * @param token Endereço do token
     * @param amount Quantidade do token (em suas decimais nativas)
     * @return usdValue Valor em USD com 18 decimais
     */
    function convertToUSD(address token, uint256 amount) 
        external 
        view 
        onlySupportedToken(token) 
        notStale(token)
        returns (uint256 usdValue) 
    {
        if (amount == 0) revert ZeroAmount();
        
        PriceData memory data = priceData[token];
        
        // Converter para 18 decimais se necessário
        if (data.decimals == 18) {
            usdValue = (amount * data.price) / 1e18;
        } else if (data.decimals < 18) {
            // Token tem menos decimais, escalar para cima
            uint256 scaleFactor = 10**(18 - data.decimals);
            usdValue = (amount * scaleFactor * data.price) / 1e18;
        } else {
            // Token tem mais decimais, escalar para baixo
            uint256 scaleFactor = 10**(data.decimals - 18);
            usdValue = (amount * data.price) / (scaleFactor * 1e18);
        }
        
        return usdValue;
    }
    
    /**
     * @dev Converte valor USD para quantidade de token
     * @param token Endereço do token
     * @param usdAmount Valor em USD (18 decimais)
     * @return tokenAmount Quantidade do token nas suas decimais nativas
     */
    function convertFromUSD(address token, uint256 usdAmount)
        external
        view
        onlySupportedToken(token)
        notStale(token)
        returns (uint256 tokenAmount)
    {
        if (usdAmount == 0) revert ZeroAmount();
        
        PriceData memory data = priceData[token];
        
        // Converter de USD para token
        if (data.decimals == 18) {
            tokenAmount = (usdAmount * 1e18) / data.price;
        } else if (data.decimals < 18) {
            // Token tem menos decimais
            uint256 scaleFactor = 10**(18 - data.decimals);
            tokenAmount = (usdAmount * 1e18) / (data.price * scaleFactor);
        } else {
            // Token tem mais decimais
            uint256 scaleFactor = 10**(data.decimals - 18);
            tokenAmount = (usdAmount * scaleFactor * 1e18) / data.price;
        }
        
        return tokenAmount;
    }
    
    /**
     * @dev Atualiza o preço de um token (apenas owner)
     * @param token Endereço do token
     * @param newPrice Novo preço em USD (18 decimais)
     */
    function updatePrice(address token, uint256 newPrice) 
        external 
        onlyOwner 
        onlySupportedToken(token) 
    {
        if (newPrice == 0) revert InvalidPrice(newPrice);
        
        priceData[token].price = newPrice;
        priceData[token].lastUpdate = block.timestamp;
        
        emit PriceUpdated(token, newPrice, block.timestamp);
    }
    
    /**
     * @dev Atualiza preços em lote
     * @param tokens Array de endereços de tokens
     * @param prices Array de novos preços
     */
    function updatePrices(address[] calldata tokens, uint256[] calldata prices) 
        external 
        onlyOwner 
    {
        require(tokens.length == prices.length, "Arrays length mismatch");
        
        for (uint256 i = 0; i < tokens.length; i++) {
            if (!priceData[tokens[i]].supported) {
                revert TokenNotSupported(tokens[i]);
            }
            if (prices[i] == 0) revert InvalidPrice(prices[i]);
            
            priceData[tokens[i]].price = prices[i];
            priceData[tokens[i]].lastUpdate = block.timestamp;
            
            emit PriceUpdated(tokens[i], prices[i], block.timestamp);
        }
    }
    
    /**
     * @dev Adiciona suporte para um novo token
     * @param token Endereço do token
     * @param decimals Decimais do token
     * @param initialPrice Preço inicial em USD (18 decimais)
     */
    function addToken(address token, uint8 decimals, uint256 initialPrice) 
        external 
        onlyOwner 
    {
        if (token == address(0) && token != NATIVE_ONE) revert ZeroAddress();
        require(!priceData[token].supported, "Token already supported");
        if (initialPrice == 0) revert InvalidPrice(initialPrice);
        
        priceData[token] = PriceData({
            price: initialPrice,
            lastUpdate: block.timestamp,
            decimals: decimals,
            supported: true
        });
        
        supportedTokens.push(token);
        
        emit TokenSupportUpdated(token, true);
        emit PriceUpdated(token, initialPrice, block.timestamp);
    }
    
    /**
     * @dev Remove suporte para um token
     * @param token Endereço do token a remover
     */
    function removeToken(address token) external onlyOwner {
        if (!priceData[token].supported) {
            revert TokenNotSupported(token);
        }
        require(token != NATIVE_ONE, "Cannot remove native ONE");
        
        priceData[token].supported = false;
        
        // Remove da lista de tokens suportados
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (supportedTokens[i] == token) {
                supportedTokens[i] = supportedTokens[supportedTokens.length - 1];
                supportedTokens.pop();
                break;
            }
        }
        
        emit TokenSupportUpdated(token, false);
    }
    
    /**
     * @dev Atualiza idade máxima do preço
     * @param newMaxAge Nova idade máxima em segundos
     */
    function setMaxPriceAge(uint256 newMaxAge) external onlyOwner {
        require(newMaxAge > 0, "Invalid max age");
        maxPriceAge = newMaxAge;
    }
    
    // ============ VIEW FUNCTIONS ============
    
    /**
     * @dev Retorna todos os tokens suportados
     * @return tokens Array de endereços de tokens suportados
     */
    function getSupportedTokens() external view returns (address[] memory tokens) {
        return supportedTokens;
    }
    
    /**
     * @dev Verifica se um preço está atualizado
     * @param token Endereço do token
     * @return isValid Se o preço está dentro da idade máxima
     */
    function isPriceValid(address token) external view returns (bool isValid) {
        if (!priceData[token].supported) return false;
        return (block.timestamp - priceData[token].lastUpdate) <= maxPriceAge;
    }
    
    /**
     * @dev Retorna dados completos de preço de um token
     * @param token Endereço do token
     * @return data Estrutura PriceData completa
     */
    function getTokenData(address token) external view returns (PriceData memory data) {
        return priceData[token];
    }
}
