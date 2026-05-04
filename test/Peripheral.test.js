const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Minor peripherical tests for GameLibrary, PriceOracle, TicketNFT, CryptoDraw', function () {
  let owner, operator, agent, user, user2;
  beforeEach(async function () {
    [owner, operator, agent, user, user2] = await ethers.getSigners();

    const TicketNFT = await ethers.getContractFactory('TicketNFT');
    this.ticketNFT = await TicketNFT.deploy();

    const initialOnePrice = ethers.utils.parseEther('2000');
    const PriceOracle = await ethers.getContractFactory('PriceOracle');
    this.priceOracle = await PriceOracle.deploy(initialOnePrice);

    // Deploy CryptoDraw
    const CryptoDraw = await ethers.getContractFactory('contracts/CryptoDrawV2.sol:CryptoDraw');
    this.cryptoDraw = await CryptoDraw.deploy(
      this.ticketNFT.address,
      this.priceOracle.address,
      owner.address,
      owner.address,
      owner.address,
      owner.address,
      owner.address
    );

    await this.ticketNFT.setCryptoDrawAddress(this.cryptoDraw.address);
    await this.cryptoDraw.grantRole(await this.cryptoDraw.OPERATOR_ROLE(), operator.address);
    await this.cryptoDraw.grantRole(await this.cryptoDraw.AGENT_ROLE(), agent.address);
    await this.cryptoDraw.setSupportedToken(ethers.constants.AddressZero, true);
  });

  it('GameLibrary: easy lotto pack/unpack/validate/count/gen edge cases', async function () {
  const TestCaller = await ethers.getContractFactory('TestGameLibCaller');
    const caller = await TestCaller.deploy();

    // invalid easy lotto: too few numbers
    const small = [1,2,3];
    expect(await caller.validateEasy(small)).to.equal(false);

    // valid easy lotto: 15 unique numbers
    const nums = [];
    for (let i=1;i<=15;i++) nums.push(i);
    expect(await caller.validateEasy(nums)).to.equal(true);
    const packed = await caller.packEasy(nums);
    const unpacked = await caller.unpackEasy(packed);
    expect(unpacked.length).to.equal(15);

    // count matches
    const packed2 = await caller.packEasy(nums.slice(0,11).concat([16,17,18,19]));
    const count = await caller.countEasy(packed, packed2);
    expect(count).to.be.a('number');

    // generate winners deterministic
    const gen = await caller.genEasy(12345, 1);
    expect(gen).to.be.a('number');
  });

  it('GameLibrary: superseven pack/unpack/validate/count/gen and invalid packed data', async function () {
  const TestCaller = await ethers.getContractFactory('TestGameLibCaller');
    const caller = await TestCaller.deploy();

    // invalid superseven: wrong length
    const bad = [1,2,3,4,5];
    expect(await caller.validateSuper(bad)).to.equal(false);

    // valid
    const cols = [0,1,2,3,4,5,6];
    expect(await caller.validateSuper(cols)).to.equal(true);
    const packed = await caller.packSuper(cols);
    const unpacked = await caller.unpackSuper(packed);
    expect(unpacked.length).to.equal(7);

    const gen = await caller.genSuper(54321, 2);
    expect(gen).to.be.a('number');
  });

  it('PriceOracle: add/remove token, convert functions, setBandFeed/clearFeed, stale/age checks', async function () {
    // Add an ERC20 mock token
  const MockToken = await ethers.getContractFactory('MockToken');
    const token = await MockToken.deploy('Mock', 'MCK', 6);

    // add token
    await this.priceOracle.addToken(token.address, 6, ethers.utils.parseUnits('2', 18));
    const supported = await this.priceOracle.getSupportedTokens();
    expect(supported).to.include(token.address);

    // convertToUSD and convertFromUSD
    const amount = ethers.utils.parseUnits('1000', 6); // 1000 tokens with 6 decimals
    const usd = await this.priceOracle.convertToUSD(token.address, amount);
    expect(usd).to.be.gt(0);
    const tokenAmt = await this.priceOracle.convertFromUSD(token.address, usd);
    expect(tokenAmt).to.equal(amount);

    // update price and batch update
    await this.priceOracle.updatePrice(token.address, ethers.utils.parseUnits('3', 18));
    await this.priceOracle.updatePrices([token.address], [ethers.utils.parseUnits('4', 18)]);

    // set band feed with invalid params reverts (stdRef zero)
    await expect(this.priceOracle.setBandFeed(token.address, ethers.constants.AddressZero, 'ONE', 'USD')).to.be.reverted;

    // clearFeed when not set still succeeds
    await this.priceOracle.clearFeed(token.address);

    // remove token
    await this.priceOracle.removeToken(token.address);
    const supportedAfter = await this.priceOracle.getSupportedTokens();
    expect(supportedAfter).to.not.include(token.address);

    // isPriceValid on native should be true
    expect(await this.priceOracle.isPriceValid(ethers.constants.AddressZero)).to.equal(true);
  });

  it('TicketNFT: mint, tokenURI, status transitions, decrement, burn, transfers blocked', async function () {
    // mint via cryptodraw mint (we already set cryptoDraw address)
    // create a draw by buying a ticket
  await this.cryptoDraw.setGameConfig(0, ethers.utils.parseEther('1'), 60, true);
  const required = ethers.utils.parseEther('0.0005');
  const tx = await this.cryptoDraw.connect(user).buyTicket(0, [1,2,3,4,5,6,7], 1, ethers.constants.AddressZero, required, ethers.constants.AddressZero, { value: required });
  const receipt = await tx.wait();
  const evt = receipt.events.find(e => e.event === 'TicketPurchased');
  const tokenId = evt.args.ticketId;
    const uri = await this.ticketNFT.tokenURI(tokenId);
    expect(uri).to.contain('data:application/json');

  // use TestTicketNFCCaller to call onlyCryptoDraw functions
  const Caller = await ethers.getContractFactory('TestTicketNFCCaller');
  const caller = await Caller.deploy(this.ticketNFT.address);
  // set caller as cryptoDraw (simulate onlyCryptoDraw) by owner calling setCryptoDrawAddress
  await this.ticketNFT.connect(owner).setCryptoDrawAddress(caller.address);

  // call decrement via caller (should succeed or update rounds)
  await caller.callDecrement(tokenId);

  // call update status via caller
  await caller.callUpdate(tokenId, 2);
  expect(await this.ticketNFT.getTicketStatus(tokenId)).to.equal(2);

  // call burn via caller
  await caller.callBurn(tokenId);

  // transfers blocked
  await expect(this.ticketNFT.transferFrom(user.address, owner.address, tokenId)).to.be.reverted;

  // restore cryptoDraw address
  await this.ticketNFT.connect(owner).setCryptoDrawAddress(this.cryptoDraw.address);
  });

  it('CryptoDraw: full flows (buy with token, buy native, agent suspension, revenue config validation, emergency withdraw)', async function () {
    // Mock ERC20
  const MockToken = await ethers.getContractFactory('MockToken');
  const token = await MockToken.deploy('Mock', 'MCK', 18);
    await token.mint(user.address, ethers.utils.parseUnits('1000', 18));

    // add ERC20
    await this.cryptoDraw.connect(owner).setSupportedToken(token.address, true);

    // purchase with token (approve)
    const usdPrice = ethers.utils.parseEther('1');
  // ensure priceOracle knows the token
  await this.priceOracle.addToken(token.address, 18, ethers.utils.parseUnits('1', 18));
  const payAmount = await this.priceOracle.convertFromUSD(token.address, usdPrice);
    await token.connect(user).approve(this.cryptoDraw.address, payAmount);

    await this.cryptoDraw.connect(user).buyTicketWithToken(0, [1,2,3,4,5,6,7], 1, token.address, payAmount, ethers.constants.AddressZero);

    // agent suspend
    await this.cryptoDraw.connect(owner).setSuspendedAgent(agent.address, true);
    await expect(this.cryptoDraw.connect(user).buyTicket(0, [1,2,3,4,5,6,7], 1, ethers.constants.AddressZero, ethers.utils.parseEther('1'), agent.address, { value: ethers.utils.parseEther('1') })).to.be.reverted;

    // invalid revenue config should revert
    await expect(this.cryptoDraw.connect(owner).setRevenueConfig({
      prizesPercent: 1000,
      projectFundPercent: 1000,
      grantFundPercent: 1000,
      operationPercent: 1000,
      agentCommissionPercent: 1000
    })).to.be.reverted;

    // emergency withdraw native to user
    // Fund contract
    await user.sendTransaction({ to: this.cryptoDraw.address, value: ethers.utils.parseEther('0.1') });
    await this.cryptoDraw.connect(owner).emergencyWithdraw(ethers.constants.AddressZero, user.address, ethers.utils.parseEther('0.05'));
  });
});
