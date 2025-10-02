const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('CryptoDrawV2 (current API) - basic flows', function () {
  async function deployFixture() {
    const [owner, operator, agent, user] = await ethers.getSigners();

    // Deploy TicketNFT and set CryptoDraw address later
    const TicketNFT = await ethers.getContractFactory('TicketNFT');
    const ticketNFT = await TicketNFT.deploy();

    // Deploy PriceOracle with initial ONE price in USD (18 decimals)
    // $2000 => 2000e18
    const initialOnePrice = ethers.utils.parseEther('2000');
    const PriceOracle = await ethers.getContractFactory('PriceOracle');
    const priceOracle = await PriceOracle.deploy(initialOnePrice);

    const treasuryWallet = owner.address;
    const prizeWallet = owner.address;
    const projectFund = owner.address;
    const grantFund = owner.address;
    const operationFund = owner.address;

    // Use fully qualified name to avoid artifact ambiguity
    const CryptoDraw = await ethers.getContractFactory('contracts/CryptoDrawV2.sol:CryptoDraw');
    const cryptoDraw = await CryptoDraw.deploy(
      ticketNFT.address,
      priceOracle.address,
      treasuryWallet,
      prizeWallet,
      projectFund,
      grantFund,
      operationFund
    );

    // Wire NFT
    await ticketNFT.setCryptoDrawAddress(cryptoDraw.address);

    // Roles
    const ADMIN_ROLE = await cryptoDraw.ADMIN_ROLE();
    const OPERATOR_ROLE = await cryptoDraw.OPERATOR_ROLE();
    const AGENT_ROLE = await cryptoDraw.AGENT_ROLE();
    await cryptoDraw.grantRole(OPERATOR_ROLE, operator.address);
    await cryptoDraw.grantRole(AGENT_ROLE, agent.address);

    // Support ONE (native)
    await cryptoDraw.setSupportedToken(ethers.constants.AddressZero, true);

    return { owner, operator, agent, user, ticketNFT, priceOracle, cryptoDraw, ADMIN_ROLE, OPERATOR_ROLE, AGENT_ROLE };
  }

  it('configures game and buys a ticket with ONE (native)', async function () {
    const { cryptoDraw, operator, user, ticketNFT } = await deployFixture();

    // Configure SuperSete (0)
    const ticketPriceUSD = ethers.utils.parseEther('1');
    const drawInterval = 24 * 60 * 60;
    await cryptoDraw.setGameConfig(0, ticketPriceUSD, drawInterval, true);

    // Buy ticket paying native ONE; compute expected payment using oracle math: $1 at $2000 => 0.0005 ONE
    const requiredOne = ethers.utils.parseEther('0.0005');
    const tx = await cryptoDraw.connect(user).buyTicket(
      0,
      [1, 2, 3, 4, 5, 6, 7],
      1,
      ethers.constants.AddressZero,
      requiredOne, // maxPaymentAmount
      ethers.constants.AddressZero,
      { value: requiredOne }
    );
    const receipt = await tx.wait();

    // TicketPurchased event
    const ev = receipt.events.find((e) => e.event === 'TicketPurchased');
    expect(ev).to.not.be.undefined;
    const ticketId = ev.args.ticketId;
    expect(await ticketNFT.ownerOf(ticketId)).to.equal(user.address);

    // A draw must be created lazily
    const currentDrawId = await cryptoDraw.getCurrentDrawId(0);
    expect(currentDrawId).to.be.gt(0);

    const draw = await cryptoDraw.getDraw(0, currentDrawId);
    expect(draw.status).to.equal(1); // OPEN
  });

  it('accrues and withdraws agent commission', async function () {
    const { cryptoDraw, agent, user } = await deployFixture();

    // Configure EasyLotto (1)
    await cryptoDraw.setGameConfig(1, ethers.utils.parseEther('2'), 7 * 24 * 60 * 60, true);

    // Buy with agent
    const requiredOne = ethers.utils.parseEther('0.001'); // $2 at $2000
    await cryptoDraw.connect(user).buyTicket(
      1,
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      1,
      ethers.constants.AddressZero,
      requiredOne,
      agent.address,
      { value: requiredOne }
    );

    const commission = await cryptoDraw.agentCommissions(agent.address);
    expect(commission).to.be.gt(0);

    // Fund contract with commission amount to enable withdrawal
    await user.sendTransaction({ to: cryptoDraw.address, value: commission });

    const before = await ethers.provider.getBalance(agent.address);
    const tx = await cryptoDraw.connect(agent).withdrawAgentCommission();
    await tx.wait();
    const after = await ethers.provider.getBalance(agent.address);

    expect(after).to.be.gt(before);
    expect(await cryptoDraw.agentCommissions(agent.address)).to.equal(0);
  });

  it('closes a draw and finalizes status', async function () {
    const { cryptoDraw, user } = await deployFixture();

    await cryptoDraw.setGameConfig(0, ethers.utils.parseEther('1'), 24 * 60 * 60, true);

    const requiredOne = ethers.utils.parseEther('0.0005');
    await cryptoDraw.connect(user).buyTicket(
      0,
      [1, 2, 3, 4, 5, 6, 7],
      1,
      ethers.constants.AddressZero,
      requiredOne,
      ethers.constants.AddressZero,
      { value: requiredOne }
    );

    const drawId = await cryptoDraw.getCurrentDrawId(0);

    await cryptoDraw.closeDraw(0, drawId, 123456);
    const closed = await cryptoDraw.getDraw(0, drawId);
    expect(closed.status).to.equal(4); // COMPLETED
    expect(closed.winningNumbersPacked).to.not.equal(0);
  });
});
