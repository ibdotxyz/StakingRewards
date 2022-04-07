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

  it('fails to create staking rewards contract', async () => {
    await expect(stakingRewardsFactory.connect(user1).createStakingRewards([stakingToken1.address])).to.be.revertedWith('Ownable: caller is not the owner')
  });
});