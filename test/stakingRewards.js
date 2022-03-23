const { expect } = require("chai");
const { ethers } = require("hardhat");

describe('StakingRewards', async () => {
  const toWei = ethers.utils.parseEther;
  const SEVEN_DAYS = 86400 * 7;

  let accounts;
  let admin, adminAddress;
  let user1, user1Address;
  let user2, user2Address;

  let stakingToken;
  let rewardsToken1;
  let rewardsToken2;
  let randomToken;

  let stakingRewards;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    admin = accounts[0];
    adminAddress = await admin.getAddress();
    user1 = accounts[1];
    user1Address = await user1.getAddress();
    user2 = accounts[2];
    user2Address = await user2.getAddress();

    const tokenFactory = await ethers.getContractFactory('MockToken');
    stakingToken = await tokenFactory.deploy();
    rewardsToken1 = await tokenFactory.deploy();
    rewardsToken2 = await tokenFactory.deploy();
    randomToken = await tokenFactory.deploy();

    const stakingRewardsFactory = await ethers.getContractFactory('MockStakingRewards');
    stakingRewards = await stakingRewardsFactory.deploy(stakingToken.address);

    await Promise.all([
      stakingToken.transfer(user1Address, toWei('100')),
      stakingToken.transfer(user2Address, toWei('100'))
    ]);
  });

  describe('stake', async () => {
    it('stakes successfully', async () => {
      await stakingToken.connect(user1).approve(stakingRewards.address, toWei('10'));
      await stakingToken.connect(user2).approve(stakingRewards.address, toWei('20'));

      await stakingRewards.connect(user1).stake(toWei('10'));
      await stakingRewards.connect(user2).stake(toWei('20'));

      expect(await stakingRewards.totalSupply()).to.eq(toWei('30'));
      expect(await stakingRewards.balanceOf(user1Address)).to.eq(toWei('10'));
      expect(await stakingRewards.balanceOf(user2Address)).to.eq(toWei('20'));
    });

    it('fails to stake for paused', async () => {
      await stakingRewards.pause();

      await expect(stakingRewards.connect(user1).stake(toWei('10'))).to.be.revertedWith('Pausable: paused');
    });

    it('fails to stake for invalid amount', async () => {
      await expect(stakingRewards.connect(user1).stake(0)).to.be.revertedWith('invalid amount');
    });
  });

  describe('stakeFor', async () => {
    it('stakes for successfully', async () => {
      await stakingToken.approve(stakingRewards.address, toWei('30'));

      await stakingRewards.stakeFor(user1Address, toWei('10'));
      await stakingRewards.stakeFor(user2Address, toWei('20'));

      expect(await stakingRewards.totalSupply()).to.eq(toWei('30'));
      expect(await stakingRewards.balanceOf(user1Address)).to.eq(toWei('10'));
      expect(await stakingRewards.balanceOf(user2Address)).to.eq(toWei('20'));
    });

    it('fails to stake for paused', async () => {
      await stakingRewards.pause();

      await expect(stakingRewards.stakeFor(user1Address, toWei('10'))).to.be.revertedWith('Pausable: paused');
    });

    it('fails to stake for invalid amount', async () => {
      await expect(stakingRewards.stakeFor(user1Address, 0)).to.be.revertedWith('invalid amount');
    });

    it('fails to stake for invalid account', async () => {
      await expect(stakingRewards.stakeFor(ethers.constants.AddressZero, toWei('10'))).to.be.revertedWith('invalid account');
    });
  });

  describe('withdraw', async () => {
    it('withdraws successfully', async () => {
      await stakingToken.connect(user1).approve(stakingRewards.address, toWei('10'));
      await stakingRewards.connect(user1).stake(toWei('10'));

      await stakingRewards.connect(user1).withdraw(toWei('10'));
      expect(await stakingRewards.totalSupply()).to.eq(0);
      expect(await stakingRewards.balanceOf(user1Address)).to.eq(0);
    });

    it('fails to stake for invalid amount', async () => {
      await expect(stakingRewards.connect(user1).withdraw(0)).to.be.revertedWith('invalid amount');
    });
  });

  describe('getReward', async () => {
    beforeEach(async () => {
      const blockTimestamp = 100000;
      await Promise.all([
        stakingRewards.setBlockTimestamp(blockTimestamp),
        stakingRewards.addRewardsToken(rewardsToken1.address, SEVEN_DAYS),
        stakingRewards.addRewardsToken(rewardsToken2.address, SEVEN_DAYS),
        rewardsToken1.transfer(stakingRewards.address, toWei('100')),
        rewardsToken2.transfer(stakingRewards.address, toWei('100')),
        stakingToken.connect(user1).approve(stakingRewards.address, toWei('100')),
        stakingToken.connect(user2).approve(stakingRewards.address, toWei('100'))
      ]);

      await stakingRewards.notifyRewardAmount(rewardsToken1.address, toWei('10'));
      await stakingRewards.notifyRewardAmount(rewardsToken2.address, toWei('50'));
    });

    it('gets rewards successfully', async () => {
      await stakingRewards.connect(user1).stake(toWei('10'));
      await stakingRewards.connect(user2).stake(toWei('20'));

      const blockTimestamp = 101000;
      await stakingRewards.setBlockTimestamp(blockTimestamp);

      const user1Reward1Earned = await stakingRewards.earned(rewardsToken1.address, user1Address);
      const user2Reward1Earned = await stakingRewards.earned(rewardsToken1.address, user2Address);
      const user1Reward2Earned = await stakingRewards.earned(rewardsToken2.address, user1Address);
      const user2Reward2Earned = await stakingRewards.earned(rewardsToken2.address, user2Address);
      expect(user1Reward1Earned).to.eq('5511463844797000'); // 1000 / (86400*7) * 10e18 * 1/3
      expect(user2Reward1Earned).to.eq('11022927689594000'); // 1000 / (86400*7) * 10e18 * 2/3
      expect(user1Reward2Earned).to.eq('27557319223985660'); // 1000 / (86400*7) * 50e18 * 1/3
      expect(user2Reward2Earned).to.eq('55114638447971320'); // 1000 / (86400*7) * 50e18 * 2/3

      await Promise.all([
        stakingRewards.connect(user1).getReward(user1Address),
        stakingRewards.connect(user2).getReward(user2Address)
      ]);
      expect(await rewardsToken1.balanceOf(user1Address)).to.eq('5511463844797000');
      expect(await rewardsToken1.balanceOf(user2Address)).to.eq('11022927689594000');
      expect(await rewardsToken2.balanceOf(user1Address)).to.eq('27557319223985660');
      expect(await rewardsToken2.balanceOf(user2Address)).to.eq('55114638447971320');
    });

    it('gets rewards successfully with balance change', async () => {
      await stakingRewards.connect(user1).stake(toWei('10'));
      await stakingRewards.connect(user2).stake(toWei('20'));

      let blockTimestamp = 101000;
      await stakingRewards.setBlockTimestamp(blockTimestamp);

      await stakingRewards.connect(user1).stake(toWei('10'));

      blockTimestamp = 102500;
      await stakingRewards.setBlockTimestamp(blockTimestamp);

      await Promise.all([
        stakingRewards.connect(user1).getReward(user1Address),
        stakingRewards.connect(user2).getReward(user2Address),
      ]);
      expect(await rewardsToken1.balanceOf(user1Address)).to.eq('17912257495590240'); // 1000 / (86400*7) * 10e18 * 1/3 + 1500 / (86400*7) * 10e18 * 1/2
      expect(await rewardsToken1.balanceOf(user2Address)).to.eq('23423721340387240'); // 1000 / (86400*7) * 10e18 * 2/3 + 1500 / (86400*7) * 10e18 * 1/2
      expect(await rewardsToken2.balanceOf(user1Address)).to.eq('89561287477953400'); // 1000 / (86400*7) * 50e18 * 1/3 + 1500 / (86400*7) * 50e18 * 1/2
      expect(await rewardsToken2.balanceOf(user2Address)).to.eq('117118606701939060'); // 1000 / (86400*7) * 50e18 * 2/3 + 1500 / (86400*7) * 50e18 * 1/2
    });

    it('gets rewards successfully with reward rate change', async () => {
      await stakingRewards.connect(user1).stake(toWei('10'));
      await stakingRewards.connect(user2).stake(toWei('20'));

      let blockTimestamp = 101000;
      await stakingRewards.setBlockTimestamp(blockTimestamp);

      await stakingRewards.notifyRewardAmount(rewardsToken1.address, toWei('20'));

      blockTimestamp = 102500;
      await stakingRewards.setBlockTimestamp(blockTimestamp);

      await Promise.all([
        stakingRewards.connect(user1).getReward(user1Address),
        stakingRewards.connect(user2).getReward(user2Address),
      ]);
      expect(await rewardsToken1.balanceOf(user1Address)).to.eq('30299381841213000'); // 1000 / (86400*7) * 10e18 * 1/3 + 1500 / (86400*7) * (20e18 + ((86400*7 - 1000) / (86400*7) * 10e18)) * 1/3
      expect(await rewardsToken1.balanceOf(user2Address)).to.eq('60598763682426000'); // 1000 / (86400*7) * 10e18 * 2/3 + 1500 / (86400*7) * (20e18 + ((86400*7 - 1000) / (86400*7) * 10e18)) * 2/3
    });
  });

  describe('notifyRewardAmount', async () => {
    beforeEach(async () => {
      const blockTimestamp = 100000;
      await Promise.all([
        stakingRewards.setBlockTimestamp(blockTimestamp),
        stakingRewards.addRewardsToken(rewardsToken1.address, SEVEN_DAYS),
      ]);
    });

    it('notifies the reward amount', async () => {
      await stakingRewards.notifyRewardAmount(rewardsToken1.address, toWei('10'));
      expect(await stakingRewards.rewardRate(rewardsToken1.address)).to.eq('16534391534391'); // 10e18 / (86400*7)
      expect(await stakingRewards.lastUpdateTime(rewardsToken1.address)).to.eq(100000);
      expect(await stakingRewards.periodFinish(rewardsToken1.address)).to.eq(100000 + SEVEN_DAYS);

      let blockTimestamp = 101000;
      await stakingRewards.setBlockTimestamp(blockTimestamp);

      await stakingRewards.notifyRewardAmount(rewardsToken1.address, toWei('20'));
      expect(await stakingRewards.rewardRate(rewardsToken1.address)).to.eq('49575835992832'); // (20e18 + ((86400*7 - 1000) / (86400*7) * 10e18)) / (86400*7)
      expect(await stakingRewards.lastUpdateTime(rewardsToken1.address)).to.eq(101000);
      expect(await stakingRewards.periodFinish(rewardsToken1.address)).to.eq(101000 + SEVEN_DAYS);
    });

    it('fails to notify reward amount for reward token not supported', async () => {
      await expect(stakingRewards.notifyRewardAmount(rewardsToken2.address, toWei('10'))).to.be.revertedWith('reward token not supported');
    });

    it('fails to notify reward amount for non-admin', async () => {
      await expect(stakingRewards.connect(user1).notifyRewardAmount(rewardsToken1.address, toWei('10'))).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('recoverToken', async () => {
    beforeEach(async () => {
      await Promise.all([
        stakingToken.transfer(stakingRewards.address, toWei('100')),
        rewardsToken1.transfer(stakingRewards.address, toWei('100')),
        randomToken.transfer(stakingRewards.address, toWei('100')),
        stakingRewards.addRewardsToken(rewardsToken1.address, SEVEN_DAYS)
      ]);
    });

    it('recovers random token', async () => {
      const balance1 = await randomToken.balanceOf(adminAddress);
      await stakingRewards.recoverToken(randomToken.address, toWei('100'));
      const balance2 = await randomToken.balanceOf(adminAddress);
      expect(balance2.sub(balance1)).to.eq(toWei('100'));
    });

    it('recovers rewards token', async () => {
      const balance1 = await rewardsToken1.balanceOf(adminAddress);
      await stakingRewards.recoverToken(rewardsToken1.address, toWei('100'));
      const balance2 = await rewardsToken1.balanceOf(adminAddress);
      expect(balance2.sub(balance1)).to.eq(toWei('100'));
    });

    it('fails to recover staking token', async () => {
      await expect(stakingRewards.recoverToken(stakingToken.address, toWei('100'))).to.be.revertedWith('cannot withdraw staking token');
    });

    it('fails to recover random token for non-admin', async () => {
      await expect(stakingRewards.connect(user1).recoverToken(randomToken.address, toWei('100'))).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('setRewardsDuration', async () => {
    it('sets reward duration successfully', async () => {
      let blockTimestamp = 100000;
      await Promise.all([
        stakingRewards.setBlockTimestamp(blockTimestamp),
        stakingRewards.addRewardsToken(rewardsToken1.address, SEVEN_DAYS),
      ]);
      expect(await stakingRewards.rewardsDuration(rewardsToken1.address)).to.eq(SEVEN_DAYS);

      const TWO_WEEKS = 86400 * 14;
      await stakingRewards.setRewardsDuration(rewardsToken1.address, TWO_WEEKS);
      expect(await stakingRewards.rewardsDuration(rewardsToken1.address)).to.eq(TWO_WEEKS);
    });

    it('fails to set reward duration for reward token not supported', async () => {
      const TWO_WEEKS = 86400 * 14;
      await expect(stakingRewards.setRewardsDuration(rewardsToken1.address, TWO_WEEKS)).to.be.revertedWith('reward token not supported');
    });

    it('fails to set reward duration for previous reward not complete', async () => {
      let blockTimestamp = 100000;
      await Promise.all([
        stakingRewards.setBlockTimestamp(blockTimestamp),
        stakingRewards.addRewardsToken(rewardsToken1.address, SEVEN_DAYS),
      ]);

      await stakingRewards.notifyRewardAmount(rewardsToken1.address, toWei('10'));

      const TWO_WEEKS = 86400 * 14;
      await expect(stakingRewards.setRewardsDuration(rewardsToken1.address, TWO_WEEKS)).to.be.revertedWith('previous rewards not complete');
    });

    it('fails to set reward duration for non-admin', async () => {
      const TWO_WEEKS = 86400 * 14;
      await expect(stakingRewards.connect(user1).setRewardsDuration(rewardsToken1.address, TWO_WEEKS)).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('addRewardsToken', async () => {
    it('adds rewards token successfully', async () => {
      await stakingRewards.addRewardsToken(rewardsToken1.address, SEVEN_DAYS);
      expect(await stakingRewards.rewardsTokensMap(rewardsToken1.address)).to.eq(true);
    });

    it('fails to add rewards token for already added', async () => {
      await stakingRewards.addRewardsToken(rewardsToken1.address, SEVEN_DAYS);
      await expect(stakingRewards.addRewardsToken(rewardsToken1.address, SEVEN_DAYS)).to.be.revertedWith('rewards token already supported');
    });

    it('fails to add rewards token for non-admin', async () => {
      await expect(stakingRewards.connect(user1).addRewardsToken(rewardsToken1.address, SEVEN_DAYS)).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });
});
