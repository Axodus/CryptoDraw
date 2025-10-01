// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/**
 * @title GameLibrary
 * @dev Biblioteca para manipulação de números dos jogos SuperSete e EasyLotto
 * @notice Implementa packing/unpacking e validação conforme especificação
 */
library GameLibrary {
    
    // ============ ERRORS ============
    
    error InvalidNumberCount();
    error InvalidNumber();
    error InvalidPackedData();
    
    // ============ CONSTANTS ============
    
    // EasyLotto (Lotofácil): 15 números de 1-25
    uint8 public constant EASYLOTTO_MIN_NUMBERS = 15;
    uint8 public constant EASYLOTTO_MAX_NUMBERS = 20;
    uint8 public constant EASYLOTTO_MIN_VALUE = 1;
    uint8 public constant EASYLOTTO_MAX_VALUE = 25;
    
    // SuperSete: 7 colunas com dígitos 0-9
    uint8 public constant SUPERSETE_COLUMNS = 7;
    uint8 public constant SUPERSETE_MIN_VALUE = 0;
    uint8 public constant SUPERSETE_MAX_VALUE = 9;
    
    // ============ EASYLOTTO FUNCTIONS ============
    
    /**
     * @dev Valida números do EasyLotto
     * @param numbers Array de números escolhidos (1-25)
     * @return valid Se os números são válidos
     */
    function validateEasyLottoNumbers(uint8[] memory numbers) 
        internal 
        pure 
        returns (bool valid) 
    {
        // Verifica quantidade de números
        if (numbers.length < EASYLOTTO_MIN_NUMBERS || 
            numbers.length > EASYLOTTO_MAX_NUMBERS) {
            return false;
        }
        
        // Verifica valores e duplicatas usando bitmask
        uint32 bitmask = 0;
        
        for (uint256 i = 0; i < numbers.length; i++) {
            uint8 num = numbers[i];
            
            // Verifica range (1-25)
            if (num < EASYLOTTO_MIN_VALUE || num > EASYLOTTO_MAX_VALUE) {
                return false;
            }
            
            // Verifica duplicatas
            uint32 bit = uint32(1) << (num - 1);
            if (bitmask & bit != 0) {
                return false; // Número duplicado
            }
            bitmask |= bit;
        }
        
        return true;
    }
    
    /**
     * @dev Empacota números do EasyLotto em uint32 (bitmask de 25 bits)
     * @param numbers Array de números (1-25)
     * @return packed Números empacotados em uint32
     */
    function packEasyLottoNumbers(uint8[] memory numbers) 
        internal 
        pure 
        returns (uint32 packed) 
    {
        if (!validateEasyLottoNumbers(numbers)) {
            revert InvalidNumber();
        }
        
        packed = 0;
        for (uint256 i = 0; i < numbers.length; i++) {
            // Bit 0 = número 1, bit 24 = número 25
            packed |= uint32(1) << (numbers[i] - 1);
        }
        
        return packed;
    }
    
    /**
     * @dev Desempacota números do EasyLotto de uint32
     * @param packed Números empacotados
     * @return numbers Array de números desempacotados
     */
    function unpackEasyLottoNumbers(uint32 packed) 
        internal 
        pure 
        returns (uint8[] memory numbers) 
    {
        // Conta quantos bits estão setados
        uint8 count = 0;
        for (uint8 i = 0; i < 25; i++) {
            if (packed & (uint32(1) << i) != 0) {
                count++;
            }
        }
        
        // Verifica se a quantidade está válida
        if (count < EASYLOTTO_MIN_NUMBERS || count > EASYLOTTO_MAX_NUMBERS) {
            revert InvalidPackedData();
        }
        
        // Extrai os números
        numbers = new uint8[](count);
        uint8 index = 0;
        for (uint8 i = 0; i < 25; i++) {
            if (packed & (uint32(1) << i) != 0) {
                numbers[index++] = i + 1; // +1 porque números vão de 1-25
            }
        }
        
        return numbers;
    }
    
    /**
     * @dev Conta números em comum entre dois conjuntos do EasyLotto
     * @param packed1 Primeiro conjunto empacotado
     * @param packed2 Segundo conjunto empacotado
     * @return count Quantidade de números em comum
     */
    function countEasyLottoMatches(uint32 packed1, uint32 packed2) 
        internal 
        pure 
        returns (uint8 count) 
    {
        // AND bitwise para encontrar bits em comum
        uint32 matches = packed1 & packed2;
        
        // Conta bits setados
        count = 0;
        for (uint8 i = 0; i < 25; i++) {
            if (matches & (uint32(1) << i) != 0) {
                count++;
            }
        }
        
        return count;
    }
    
    // ============ SUPERSETE FUNCTIONS ============
    
    /**
     * @dev Valida números do SuperSete
     * @param columns Array de 7 dígitos (0-9)
     * @return valid Se os números são válidos
     */
    function validateSuperSeteNumbers(uint8[] memory columns) 
        internal 
        pure 
        returns (bool valid) 
    {
        // Deve ter exatamente 7 colunas
        if (columns.length != SUPERSETE_COLUMNS) {
            return false;
        }
        
        // Cada coluna deve estar entre 0-9
        for (uint256 i = 0; i < SUPERSETE_COLUMNS; i++) {
            if (columns[i] > SUPERSETE_MAX_VALUE) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * @dev Empacota números do SuperSete em uint32 (7 colunas × 4 bits = 28 bits)
     * @param columns Array de 7 dígitos (0-9)
     * @return packed Números empacotados em uint32
     */
    function packSuperSeteNumbers(uint8[] memory columns) 
        internal 
        pure 
        returns (uint32 packed) 
    {
        if (!validateSuperSeteNumbers(columns)) {
            revert InvalidNumber();
        }
        
        packed = 0;
        for (uint8 i = 0; i < SUPERSETE_COLUMNS; i++) {
            // Cada coluna usa 4 bits
            // Coluna 1 = bits 0-3, Coluna 2 = bits 4-7, etc.
            packed |= uint32(columns[i]) << (i * 4);
        }
        
        return packed;
    }
    
    /**
     * @dev Desempacota números do SuperSete de uint32
     * @param packed Números empacotados
     * @return columns Array de 7 dígitos desempacotados
     */
    function unpackSuperSeteNumbers(uint32 packed) 
        internal 
        pure 
        returns (uint8[] memory columns) 
    {
        columns = new uint8[](SUPERSETE_COLUMNS);
        
        for (uint8 i = 0; i < SUPERSETE_COLUMNS; i++) {
            // Extrai 4 bits para cada coluna
            columns[i] = uint8((packed >> (i * 4)) & 0x0F);
            
            // Valida que o valor está no range 0-9
            if (columns[i] > SUPERSETE_MAX_VALUE) {
                revert InvalidPackedData();
            }
        }
        
        return columns;
    }
    
    /**
     * @dev Conta acertos do SuperSete (quantas colunas batem)
     * @param packed1 Primeiro conjunto empacotado
     * @param packed2 Segundo conjunto empacotado
     * @return count Quantidade de colunas que batem
     */
    function countSuperSeteMatches(uint32 packed1, uint32 packed2) 
        internal 
        pure 
        returns (uint8 count) 
    {
        count = 0;
        
        for (uint8 i = 0; i < SUPERSETE_COLUMNS; i++) {
            // Extrai o dígito de cada coluna
            uint8 digit1 = uint8((packed1 >> (i * 4)) & 0x0F);
            uint8 digit2 = uint8((packed2 >> (i * 4)) & 0x0F);
            
            if (digit1 == digit2) {
                count++;
            }
        }
        
        return count;
    }
    
    // ============ RANDOM NUMBER GENERATION ============
    
    /**
     * @dev Gera números vencedores do EasyLotto deterministicamente
     * @param randomness Valor de randomness do VRF
     * @param drawId ID do sorteio (para entropia adicional)
     * @return packed Números vencedores empacotados
     */
    function generateEasyLottoWinning(uint256 randomness, uint32 drawId) 
        internal 
        pure 
        returns (uint32 packed) 
    {
        uint256 seed = uint256(keccak256(abi.encodePacked(randomness, drawId)));
        packed = 0;
        uint8 count = 0;
        
        // Gera 15 números únicos de 1-25
        while (count < EASYLOTTO_MIN_NUMBERS) {
            seed = uint256(keccak256(abi.encodePacked(seed, count)));
            uint8 num = uint8((seed % 25) + 1); // 1-25
            
            uint32 bit = uint32(1) << (num - 1);
            
            // Se o número ainda não foi escolhido
            if (packed & bit == 0) {
                packed |= bit;
                count++;
            }
        }
        
        return packed;
    }
    
    /**
     * @dev Gera números vencedores do SuperSete deterministicamente
     * @param randomness Valor de randomness do VRF
     * @param drawId ID do sorteio (para entropia adicional)
     * @return packed Números vencedores empacotados
     */
    function generateSuperSeteWinning(uint256 randomness, uint32 drawId) 
        internal 
        pure 
        returns (uint32 packed) 
    {
        uint256 seed = uint256(keccak256(abi.encodePacked(randomness, drawId)));
        packed = 0;
        
        // Gera 7 dígitos de 0-9
        for (uint8 col = 0; col < SUPERSETE_COLUMNS; col++) {
            seed = uint256(keccak256(abi.encodePacked(seed, col)));
            uint8 digit = uint8(seed % 10); // 0-9
            packed |= uint32(digit) << (col * 4);
        }
        
        return packed;
    }
}
