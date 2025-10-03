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

  it('buyTicket native: underpay, exact and overpay refund', async function () {
    const { user1, cryptoDraw } = await deployFixture();

    // Underpay should revert
    await expect(
      cryptoDraw.connect(user1).buyTicket(
        0,
        [1,2,3,4,5,6,7],
        1,
        ethers.constants.AddressZero,
        ethers.utils.parseEther('1'),
        ethers.constants.AddressZero,
        { value: ethers.utils.parseEther('0.5') }
      )
    ).to.be.revertedWith('Insufficient native payment');

    // Exact amount should work
    await expect(
      cryptoDraw.connect(user1).buyTicket(
        0,
        [1,2,3,4,5,6,7],
        1,
        ethers.constants.AddressZero,
        ethers.utils.parseEther('1'),
        ethers.constants.AddressZero,
        { value: ethers.utils.parseEther('1') }
    )).to.not.be.reverted;

    // Overpay should refund excess
    const before = await user1.getBalance();
    const tx = await cryptoDraw.connect(user1).buyTicket(
      0,
      [1,2,3,4,5,6,7],
      1,
      ethers.constants.AddressZero,
      ethers.utils.parseEther('2'),
      ethers.constants.AddressZero,
      { value: ethers.utils.parseEther('2') }
    );
    const rcpt = await tx.wait();
    const gas = rcpt.gasUsed.mul(rcpt.effectiveGasPrice);
    const after = await user1.getBalance();

    // final balance should be roughly before - 1 (ticket price) - gas
    expect(after).to.be.closeTo(before.sub(ethers.utils.parseEther('1')).sub(gas), ethers.utils.parseEther('0.01'));
  });

  it('buyTicket with agent and withdrawAgentCommission flow', async function () {
    const { agent, user1, cryptoDraw } = await deployFixture();

    // Grant agent role already done in fixture; buy ticket with agent
    await cryptoDraw.connect(user1).buyTicket(
      0,
      [1,2,3,4,5,6,7],
      1,
      ethers.constants.AddressZero,
      ethers.utils.parseEther('1'),
      agent.address,
      { value: ethers.utils.parseEther('1') }
    );

    const commission = await cryptoDraw.agentCommissions(agent.address);
    expect(commission).to.be.gt(0);

    // Fund contract so agent can withdraw
    await user1.sendTransaction({ to: cryptoDraw.address, value: commission });

    const before = await ethers.provider.getBalance(agent.address);
    const tx = await cryptoDraw.connect(agent).withdrawAgentCommission();
    await tx.wait();
    const after = await ethers.provider.getBalance(agent.address);

    expect(after).to.be.gt(before);
    expect(await cryptoDraw.agentCommissions(agent.address)).to.equal(0);
  });

  it('claimPrize happy path, withdrawPrize and NFT status update', async function () {
    const { owner, operator, user1, cryptoDraw, ticketNFT } = await deployFixture();

    // Create draw explicitly so we know drawId
    await cryptoDraw.connect(operator).createDraw(0);
    const drawId = await cryptoDraw.getCurrentDrawId(0);

    // Compute winning digits for randomness = 0 (same algorithm as GameLibrary.generateSuperSevenWinning)
    const ethersLib = ethers;
    const seed0 = ethersLib.utils.solidityKeccak256(['uint256','uint32'], [0, drawId]);
    let seed = seed0;
    const digits = [];
    for (let col = 0; col < 7; col++) {
      seed = ethersLib.utils.solidityKeccak256(['bytes32','uint8'], [seed, col]);
      const bn = ethersLib.BigNumber.from(seed);
      digits.push(bn.mod(10).toNumber());
    }

    // user1 buys ticket with the winning digits
    const tx = await cryptoDraw.connect(user1).buyTicket(
      0,
      digits,
      1,
      ethers.constants.AddressZero,
      ethers.utils.parseEther('1'),
      ethers.constants.AddressZero,
      { value: ethers.utils.parseEther('1') }
    );
    const rcpt = await tx.wait();
    const ev = rcpt.events.find((e) => e.event === 'TicketPurchased');
    const ticketId = ev.args.ticketId;

    // Close draw with randomness = 0
    await cryptoDraw.connect(operator)['closeDraw(uint8,uint32,uint256)'](0, drawId, 0);

    // Claim prize as owner of ticket
    await cryptoDraw.connect(user1).claimPrize(ticketId);

    const withdrawable = await cryptoDraw.withdrawableBalances(user1.address);
    expect(withdrawable).to.be.gt(0);

    // Fund contract to allow withdrawPrize
    await user1.sendTransaction({ to: cryptoDraw.address, value: withdrawable });

    const beforeBal = await ethers.provider.getBalance(user1.address);
    const tx2 = await cryptoDraw.connect(user1).withdrawPrize();
    const rcpt2 = await tx2.wait();
    const afterBal = await ethers.provider.getBalance(user1.address);
    expect(afterBal).to.be.gt(beforeBal);

    // Ticket status should be REDEEMED
    const ticket = await ticketNFT.getTicket(ticketId);
    expect(ticket[7]).to.equal(2); // ITicketNFTv2.TicketStatus.REDEEMED
  });

  it('closeDrawSimple emits DrawClosed and closeDraw emits DrawCompleted + RevenueDistributed', async function () {
    const { operator, user1, cryptoDraw } = await deployFixture();

    // create draw and buy
    await cryptoDraw.connect(operator).createDraw(0);
    const drawId = await cryptoDraw.getCurrentDrawId(0);
    await cryptoDraw.connect(user1).buyTicket(0, [1,2,3,4,5,6,7], 1, ethers.constants.AddressZero, ethers.utils.parseEther('1'), ethers.constants.AddressZero, { value: ethers.utils.parseEther('1') });

    // closeDrawSimple
    const tx = await cryptoDraw.connect(operator).closeDrawSimple(0, drawId);
    const rcpt = await tx.wait();
    expect(rcpt.events.find((e) => e.event === 'DrawClosed')).to.not.be.undefined;

    // create another draw, buy and close with randomness
    await cryptoDraw.connect(operator).createDraw(0);
    const drawId2 = await cryptoDraw.getCurrentDrawId(0);
    await cryptoDraw.connect(user1).buyTicket(0, [1,2,3,4,5,6,7], 1, ethers.constants.AddressZero, ethers.utils.parseEther('1'), ethers.constants.AddressZero, { value: ethers.utils.parseEther('1') });

    const tx2 = await cryptoDraw.connect(operator)['closeDraw(uint8,uint32,uint256)'](0, drawId2, 1);
    const rcpt2 = await tx2.wait();
    expect(rcpt2.events.find((e) => e.event === 'DrawCompleted')).to.not.be.undefined;
    expect(rcpt2.events.find((e) => e.event === 'RevenueDistributed')).to.not.be.undefined;
  });

  it('pause blocks buyTicket and unpause restores', async function () {
    const { owner, user1, cryptoDraw } = await deployFixture();

    await cryptoDraw.connect(owner).pause();
    await expect(
      cryptoDraw.connect(user1).buyTicket(0, [1,2,3,4,5,6,7], 1, ethers.constants.AddressZero, ethers.utils.parseEther('1'), ethers.constants.AddressZero, { value: ethers.utils.parseEther('1') })
    ).to.be.revertedWith('Pausable: paused');

    await cryptoDraw.connect(owner).unpause();
    await expect(
      cryptoDraw.connect(user1).buyTicket(0, [1,2,3,4,5,6,7], 1, ethers.constants.AddressZero, ethers.utils.parseEther('1'), ethers.constants.AddressZero, { value: ethers.utils.parseEther('1') })
    ).to.not.be.reverted;
  });
});
