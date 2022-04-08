const { expect } = require("chai");
const { ethers } = require("hardhat");

describe('StakingRewardsFactory', async () => {
  let stakingToken1, stakingToken2, stakingToken3;
  let stakingRewardsFactory;
  let stakingRewardsContractFactory;

  let accounts;
  let admin, adminAddress;
  let user1, user1Address;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    admin = accounts[0];
    adminAddress = await admin.getAddress();
    user1 = accounts[1];
    user1Address = await user1.getAddress();

    const tokenFactory = await ethers.getContractFactory('MockToken');
    stakingToken1 = await tokenFactory.deploy();
    stakingToken2 = await tokenFactory.deploy();
    stakingToken3 = await tokenFactory.deploy();

    const stakingRewardsFactoryFactory = await ethers.getContractFactory('StakingRewardsFactory');
    stakingRewardsFactory = await stakingRewardsFactoryFactory.deploy();
    stakingRewardsContractFactory = await ethers.getContractFactory('StakingRewards');
  });

  it('creates staking rewards contract', async () => {
    await stakingRewardsFactory.createStakingRewards([stakingToken1.address, stakingToken2.address, stakingToken3.address]);
    expect(await stakingRewardsFactory.getStakingRewardsCount()).to.eq(3);

    const stakingRewards1Address = await stakingRewardsFactory.stakingRewardsMap(stakingToken1.address);
    const stakingRewards1 = await stakingRewardsContractFactory.attach(stakingRewards1Address);
    expect(await stakingRewards1.owner()).to.eq(adminAddress);

    const stakingRewards2Address = await stakingRewardsFactory.stakingRewardsMap(stakingToken2.address);
    const stakingRewards2 = await stakingRewardsContractFactory.attach(stakingRewards2Address);
    expect(await stakingRewards2.owner()).to.eq(adminAddress);

    const stakingRewards3Address = await stakingRewardsFactory.stakingRewardsMap(stakingToken3.address);
    const stakingRewards3 = await stakingRewardsContractFactory.attach(stakingRewards3Address);
    expect(await stakingRewards3.owner()).to.eq(adminAddress);
  });

  it('fails to create staking rewards contract for non-admin', async () => {
    await expect(stakingRewardsFactory.connect(user1).createStakingRewards([stakingToken1.address])).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('fails to create staking rewards contract for already exist', async () => {
    await stakingRewardsFactory.createStakingRewards([stakingToken1.address]);
    await expect(stakingRewardsFactory.createStakingRewards([stakingToken1.address])).to.be.revertedWith('staking rewards contract already exist');
  });

  it('removes staking rewards contract', async () => {
    await stakingRewardsFactory.createStakingRewards([stakingToken1.address, stakingToken2.address, stakingToken3.address]);
    await stakingRewardsFactory.removeStakingRewards(stakingToken2.address);

    expect(await stakingRewardsFactory.getStakingRewardsCount()).to.eq(2);
    const stakingRewards1Address = await stakingRewardsFactory.stakingRewardsMap(stakingToken1.address);
    expect(await stakingRewardsFactory.stakingRewards(0)).to.eq(stakingRewards1Address);
    const stakingRewards2Address = await stakingRewardsFactory.stakingRewardsMap(stakingToken2.address);
    expect(stakingRewards2Address).to.eq(ethers.constants.AddressZero);
    const stakingRewards3Address = await stakingRewardsFactory.stakingRewardsMap(stakingToken3.address);
    expect(await stakingRewardsFactory.stakingRewards(1)).to.eq(stakingRewards3Address);
  });

  it('fails to remove staking rewards contract for non-admin', async () => {
    await expect(stakingRewardsFactory.connect(user1).removeStakingRewards(stakingToken1.address)).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('fails to remove staking rewards contract for not exist', async () => {
    await expect(stakingRewardsFactory.removeStakingRewards(stakingToken1.address)).to.be.revertedWith('staking rewards contract not exist');
  });
});
