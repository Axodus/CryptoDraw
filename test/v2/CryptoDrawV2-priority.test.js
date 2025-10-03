const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('CryptoDrawV2 - Priority tests', function () {
  async function deployFixture() {
    const [owner, operator, agent, user1, user2, treasury, prize, project, grant, operation] = await ethers.getSigners();

    const TicketNFT = await ethers.getContractFactory('TicketNFT');
    const ticketNFT = await TicketNFT.deploy();

    const PriceOracle = await ethers.getContractFactory('PriceOracle');
    const priceOracle = await PriceOracle.deploy(ethers.utils.parseEther('1'));

    const CryptoDraw = await ethers.getContractFactory('contracts/CryptoDrawV2.sol:CryptoDraw');
    const cryptoDraw = await CryptoDraw.deploy(
      ticketNFT.address,
      priceOracle.address,
      treasury.address,
      prize.address,
      project.address,
      grant.address,
      operation.address
    );

    await ticketNFT.setCryptoDrawAddress(cryptoDraw.address);

    // Roles
    const OPERATOR_ROLE = await cryptoDraw.OPERATOR_ROLE();
    const AGENT_ROLE = await cryptoDraw.AGENT_ROLE();
    await cryptoDraw.grantRole(OPERATOR_ROLE, operator.address);
    await cryptoDraw.grantRole(AGENT_ROLE, agent.address);

    // Deploy mock token and fund user1
    const MockToken = await ethers.getContractFactory('MockToken');
    const mockToken = await MockToken.deploy('Mock Token', 'MOCK', 18);
    await mockToken.mint(user1.address, ethers.utils.parseEther('1000'));

    // Register token in oracle and enable support in CryptoDraw
    await priceOracle.addToken(mockToken.address, 18, ethers.utils.parseEther('1'));
    await cryptoDraw.updateTokenSupport(mockToken.address, true);
    await cryptoDraw.updateTokenSupport(ethers.constants.AddressZero, true);

    return { owner, operator, agent, user1, user2, ticketNFT, priceOracle, cryptoDraw, mockToken };
  }

  it('operator can createDraw and emits DrawCreated', async function () {
    const { operator, cryptoDraw } = await deployFixture();

    const tx = await cryptoDraw.connect(operator).createDraw(0);
    const rcpt = await tx.wait();

    const ev = rcpt.events.find((e) => e.event === 'DrawCreated');
    expect(ev).to.not.be.undefined;

    const current = await cryptoDraw.getCurrentDrawId(0);
    expect(current).to.be.gt(0);
  });

  it('buyTicketWithToken wrapper works using ERC20', async function () {
    const { user1, cryptoDraw, mockToken } = await deployFixture();

    // Approve and buy using ERC20 wrapper
    await mockToken.connect(user1).approve(cryptoDraw.address, ethers.utils.parseEther('1'));

    const tx = await cryptoDraw.connect(user1).buyTicketWithToken(
      0,
      [1,2,3,4,5,6,7],
      1,
      mockToken.address,
      ethers.utils.parseEther('1'),
      ethers.constants.AddressZero
    );

    const rcpt = await tx.wait();
    const ev = rcpt.events.find((e) => e.event === 'TicketPurchased');
    expect(ev).to.not.be.undefined;
  });

  it('emergencyWithdraw reverts when to == zero address', async function () {
    const { owner, cryptoDraw, mockToken } = await deployFixture();

    await expect(
      cryptoDraw.connect(owner).emergencyWithdraw(mockToken.address, ethers.constants.AddressZero, ethers.utils.parseEther('1'))
    ).to.be.revertedWithCustomError(cryptoDraw, 'ZeroAddress');
  });

  it('emergencyWithdraw transfers native ONE when called by admin', async function () {
    const { owner, cryptoDraw, user1 } = await deployFixture();

    // send native value to contract
    await owner.sendTransaction({ to: cryptoDraw.address, value: ethers.utils.parseEther('1') });

    const before = await ethers.provider.getBalance(user1.address);
    const tx = await cryptoDraw.connect(owner).emergencyWithdraw(ethers.constants.AddressZero, user1.address, ethers.utils.parseEther('1'));
    await tx.wait();
    const after = await ethers.provider.getBalance(user1.address);

    expect(after).to.be.gt(before);
  });

  it('setWallets updates only non-zero addresses', async function () {
    const { owner, cryptoDraw, user1 } = await deployFixture();

    // change only treasuryWallet, leave others zero (should keep current)
    await cryptoDraw.connect(owner).setWallets(user1.address, ethers.constants.AddressZero, ethers.constants.AddressZero, ethers.constants.AddressZero, ethers.constants.AddressZero);

    const newTreasury = await cryptoDraw.treasuryWallet();
    expect(newTreasury).to.equal(user1.address);
  });

  it('claimPrize reverts when caller is not ticket owner', async function () {
    const { user1, user2, cryptoDraw, mockToken } = await deployFixture();

    // user1 buys a ticket (ERC20)
    await mockToken.connect(user1).approve(cryptoDraw.address, ethers.utils.parseEther('1'));
    const tx = await cryptoDraw.connect(user1).buyTicketWithToken(
      0,
      [1,2,3,4,5,6,7],
      1,
      mockToken.address,
      ethers.utils.parseEther('1'),
      ethers.constants.AddressZero
    );
    const rcpt = await tx.wait();
    const ev = rcpt.events.find((e) => e.event === 'TicketPurchased');
    const ticketId = ev.args.ticketId;

    await expect(
      cryptoDraw.connect(user2).claimPrize(ticketId)
    ).to.be.revertedWithCustomError(cryptoDraw, 'NotTicketOwner');
  });
});
