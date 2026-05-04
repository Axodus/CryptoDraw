const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    const network = process.env.NETWORK; // A rede deve ser especificada nas variáveis de ambiente
    if (!network) {
        throw new Error("A variável de ambiente NETWORK não está definida.");
    }

    // Carregar configuração do arquivo config.json
    const config = JSON.parse(fs.readFileSync("src/config.json", "utf8"));
    const networkConfig = config[network];

    if (!networkConfig) {
        throw new Error(`Configuração para a rede ${network} não encontrada no config.json.`);
    }

    const {
        RPC_URL,
        NATIVE_TOKEN,
        TICKET_NFT_ADDRESS,
        VRF_COORDINATOR_ADDRESS,
        KEY_HASH,
        SUBSCRIPTION_ID,
        PRICE_FEED_ADDRESS,
        PROJECT_FUND,
        GRANT_FUND,
        OPERATION_FUND
    } = networkConfig;

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Verifica se o endereço do TicketNFT foi fornecido
    if (!TICKET_NFT_ADDRESS) {
        throw new Error("O endereço do TicketNFT deve ser especificado no arquivo config.json");
    }

    // Deploy do contrato CryptoDraw usando o endereço do TicketNFT existente
    const CryptoDraw = await ethers.getContractFactory("CryptoDraw");
    const cryptoDraw = await CryptoDraw.deploy(
        NATIVE_TOKEN,
        TICKET_NFT_ADDRESS,
        VRF_COORDINATOR_ADDRESS,
        KEY_HASH,
        SUBSCRIPTION_ID,
        PRICE_FEED_ADDRESS,
        PROJECT_FUND,
        GRANT_FUND,
        OPERATION_FUND
    );

    await cryptoDraw.deployed();
    console.log("CryptoDraw deployed to:", cryptoDraw.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

