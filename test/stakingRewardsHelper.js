const { expect } = require("chai");
const { ethers, waffle } = require("hardhat");

describe('StakingRewardsHelper', async () => {
  const toWei = ethers.utils.parseEther;
  const SEVEN_DAYS = 86400 * 7;
  const exchangeRate = toWei('2');

  let token1, token2;
  let wrappedNative;
  let rewardsToken;
  let stakingToken1, stakingToken2;
  let stakingTokenWrappedNative;
  let stakingRewards1, stakingRewards2;
  let stakingRewardsWrappedNative;

  let stakingRewardsHelper;
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

    const wrappedNativeFactory = await ethers.getContractFactory("WETH9");
    wrappedNative = await wrappedNativeFactory.deploy();

    const tokenFactory = await ethers.getContractFactory('MockToken');
    token1 = await tokenFactory.deploy();
    token2 = await tokenFactory.deploy();
    rewardsToken = await tokenFactory.deploy();

    const iTokenFactory = await ethers.getContractFactory('MockIToken');
    stakingToken1 = await iTokenFactory.deploy(token1.address);
    stakingToken2 = await iTokenFactory.deploy(token2.address);
    stakingTokenWrappedNative = await iTokenFactory.deploy(wrappedNative.address);

    // Set exchange rate.
    await Promise.all([
      stakingToken1.setExchangeRateStored(exchangeRate),
      stakingToken2.setExchangeRateStored(exchangeRate),
      stakingTokenWrappedNative.setExchangeRateStored(exchangeRate)
    ]);

    const stakingRewardsFactoryFactory = await ethers.getContractFactory('StakingRewardsFactory');
    stakingRewardsFactory = await stakingRewardsFactoryFactory.deploy();

    const stakingRewardsHelperFactory = await ethers.getContractFactory('StakingRewardsHelper');
    stakingRewardsHelper = await stakingRewardsHelperFactory.deploy(stakingRewardsFactory.address, wrappedNative.address);

    // Deploy 2 staking rewards contracts via factory.
    await stakingRewardsFactory.createStakingRewards([stakingToken1.address, stakingToken2.address, stakingTokenWrappedNative.address], stakingRewardsHelper.address);

    stakingRewardsContractFactory = await ethers.getContractFactory('StakingRewards');
    const stakingRewards1Address = await stakingRewardsFactory.getStakingRewards(stakingToken1.address);
    stakingRewards1 = stakingRewardsContractFactory.attach(stakingRewards1Address);
    const stakingRewards2Address = await stakingRewardsFactory.getStakingRewards(stakingToken2.address);
    stakingRewards2 = stakingRewardsContractFactory.attach(stakingRewards2Address);
    stakingRewardsWrappedNative = stakingRewardsContractFactory.attach(await stakingRewardsFactory.getStakingRewards(stakingTokenWrappedNative.address));

    // Setup rewards tokens for staking rewards contracts.
    await Promise.all([
      stakingRewards1.addRewardsToken(rewardsToken.address, SEVEN_DAYS),
      stakingRewards2.addRewardsToken(rewardsToken.address, SEVEN_DAYS),
      stakingRewardsWrappedNative.addRewardsToken(rewardsToken.address, SEVEN_DAYS),
      rewardsToken.transfer(stakingRewards1.address, toWei('100')),
      rewardsToken.transfer(stakingRewards2.address, toWei('100')),
      rewardsToken.transfer(stakingRewardsWrappedNative.address, toWei('100'))
    ]);

    await Promise.all([
      stakingRewards1.notifyRewardAmount(rewardsToken.address, toWei('10')),
      stakingRewards2.notifyRewardAmount(rewardsToken.address, toWei('20')),
      stakingRewardsWrappedNative.notifyRewardAmount(rewardsToken.address, toWei('20'))
    ]);

    // Give user1 some underlying tokens.
    await Promise.all([
      token1.transfer(user1Address, toWei('100')),
      token2.transfer(user1Address, toWei('100'))
    ]);
  });

  describe('stake', async () => {
    it('stakes successfully', async () => {
      await token1.connect(user1).approve(stakingRewardsHelper.address, toWei('100'));
      await stakingRewardsHelper.connect(user1).stake(token1.address, toWei('100'));

      expect(await stakingRewards1.balanceOf(user1Address)).to.eq(toWei('200')); // 100 * 2

      // 100 token1 transfer from user1 to stakingToken1
      expect(await token1.balanceOf(user1Address)).to.eq(0);
      expect(await token1.balanceOf(stakingRewardsHelper.address)).to.eq(0);
      expect(await token1.balanceOf(stakingToken1.address)).to.eq(toWei('100'));

      // 200 stakingToken1 mint and transfer to stakingRewards1
      expect(await stakingToken1.balanceOf(stakingRewardsHelper.address)).to.eq(0);
      expect(await stakingToken1.balanceOf(stakingRewards1.address)).to.eq(toWei('200'));
    });

    it('fails to stake for mint failure', async () => {
      await stakingToken1.setMintFailed();

      await token1.connect(user1).approve(stakingRewardsHelper.address, toWei('100'));
      await expect(stakingRewardsHelper.connect(user1).stake(token1.address, toWei('100'))).to.be.revertedWith('mint faile');
    });
  });

  describe('stakeNative', async()=> {
    it('stakes successfully', async () => {
      await stakingRewardsHelper.connect(user1).stakeNative({value:toWei('100')});

      expect(await stakingRewardsWrappedNative.balanceOf(user1Address)).to.eq(toWei('200')); // 100 * 2

      // 100 token1 transfer from user1 to stakingToken1
      expect(await wrappedNative.balanceOf(user1Address)).to.eq(0);
      expect(await wrappedNative.balanceOf(stakingRewardsHelper.address)).to.eq(0);
      expect(await wrappedNative.balanceOf(stakingTokenWrappedNative.address)).to.eq(toWei('100'));

      // 200 stakingToken1 mint and transfer to stakingRewards1
      expect(await stakingTokenWrappedNative.balanceOf(stakingRewardsHelper.address)).to.eq(0);
      expect(await stakingTokenWrappedNative.balanceOf(stakingRewardsWrappedNative.address)).to.eq(toWei('200'));
    });

    it('fails to stake for mint native failure', async () => {
      await stakingTokenWrappedNative.setMintFailed();
      await wrappedNative.connect(user1).deposit({value:toWei('100')});
      await wrappedNative.connect(user1).approve(stakingRewardsHelper.address, toWei('100'));
      await expect(stakingRewardsHelper.connect(user1).stakeNative({value:toWei('100')})).to.be.revertedWith('mint native failed');
    });
  })

  describe('unstake', async () => {
    it('unstakes successfully', async () => {
      await token1.connect(user1).approve(stakingRewardsHelper.address, toWei('100'));
      await stakingRewardsHelper.connect(user1).stake(token1.address, toWei('100'));

      expect(await stakingRewards1.balanceOf(user1Address)).to.eq(toWei('200')); // 100 * 2

      await stakingRewardsHelper.connect(user1).unstake(stakingRewards1.address, toWei('200'), false);

      // 100 token1 transfer from stakingToken1 to user1
      expect(await token1.balanceOf(user1Address)).to.eq(toWei('100'));
      expect(await token1.balanceOf(stakingRewardsHelper.address)).to.eq(0);
      expect(await token1.balanceOf(stakingToken1.address)).to.eq(0);

      // 200 stakingToken1 burn
      expect(await stakingToken1.balanceOf(stakingRewardsHelper.address)).to.eq(0);
      expect(await stakingToken1.balanceOf(stakingRewards1.address)).to.eq(0);
    });

    it('unstakes native successfully', async () => {
      await stakingRewardsHelper.connect(user1).stakeNative({value:toWei('100')});

      expect(await stakingRewardsWrappedNative.balanceOf(user1Address)).to.eq(toWei('200')); // 100 * 2

      const preUnstakeBalance = await waffle.provider.getBalance(user1Address);
      const tx  = await stakingRewardsHelper.connect(user1).unstake(stakingRewardsWrappedNative.address, toWei('200'), true);
      const receipt = await tx.wait()
      const gas = receipt.gasUsed.mul(tx.gasPrice);
      const postUnstakeBalance = await waffle.provider.getBalance(user1Address);

      // 100 token1 transfer from stakingTokenWrappedNative to user1
      expect(postUnstakeBalance.add(gas).sub(preUnstakeBalance)).to.eq(toWei('100'));
      expect(await wrappedNative.balanceOf(stakingRewardsHelper.address)).to.eq(0);
      expect(await wrappedNative.balanceOf(stakingTokenWrappedNative.address)).to.eq(0);

      // 200 stakingTokenWrappedNative burn
      expect(await stakingTokenWrappedNative.balanceOf(stakingRewardsHelper.address)).to.eq(0);
      expect(await stakingTokenWrappedNative.balanceOf(stakingRewardsWrappedNative.address)).to.eq(0);
    });

    it('fails to unstake for redeem failure', async () => {
      await token1.connect(user1).approve(stakingRewardsHelper.address, toWei('100'));
      await stakingRewardsHelper.connect(user1).stake(token1.address, toWei('100'));

      await stakingToken1.setRedeemFailed();

      await expect(stakingRewardsHelper.connect(user1).unstake(stakingRewards1.address, toWei('200'), false)).to.be.revertedWith('redeem faile');
    });

    it('fails to unstake native for redeem native failure', async () => {
      await stakingRewardsHelper.connect(user1).stakeNative({value:toWei('100')});

      await stakingTokenWrappedNative.setRedeemFailed();

      await expect(stakingRewardsHelper.connect(user1).unstake(stakingRewardsWrappedNative.address, toWei('200'), true)).to.be.revertedWith('redeem native failed');
    });
  });

  describe('claimAllRewards / claimRewards / getUserClaimableRewards / getUserStaked', async () => {
    beforeEach(async () => {
      await Promise.all([
        token1.connect(user1).approve(stakingRewardsHelper.address, toWei('100')),
        token2.connect(user1).approve(stakingRewardsHelper.address, toWei('100'))
      ]);
      await Promise.all([
        stakingRewardsHelper.connect(user1).stake(token1.address, toWei('100')),
        stakingRewardsHelper.connect(user1).stake(token2.address, toWei('100'))
      ]);
      await waffle.provider.send("evm_increaseTime", [3600]);
      await waffle.provider.send("evm_mine");
    });

    it('claims all rewards successfully', async () => {
      await stakingRewardsHelper.connect(user1).claimAllRewards();

      // Note: there are 3 - 5 seconds delay caused by 'evm_mine' in the following calculation.
      const bal = await rewardsToken.balanceOf(user1Address);
      expect(bal).to.gt(toWei('0.1785')); // 3600 / (86400*7) * 10e18 + 3600 / (86400*7) * 20e18
      expect(bal).to.lt(toWei('0.1789'));

      expect(await stakingRewards1.earned(rewardsToken.address, user1Address)).to.eq(0);
      expect(await stakingRewards2.earned(rewardsToken.address, user1Address)).to.eq(0);
    });

    it('claims some rewards successfully', async () => {
      await stakingRewardsHelper.connect(user1).claimRewards([stakingRewards1.address]);

      // Note: there are 3 - 5 seconds delay caused by 'evm_mine' in the following calculation.
      const bal = await rewardsToken.balanceOf(user1Address);
      expect(bal).to.gt(toWei('0.0595')); // 3600 / (86400*7) * 10e18
      expect(bal).to.lt(toWei('0.0597'));

      expect(await stakingRewards1.earned(rewardsToken.address, user1Address)).to.eq(0);
      expect(await stakingRewards2.earned(rewardsToken.address, user1Address)).to.gt(0);
    });

    it('exits all successfully', async () => {
      await stakingRewardsHelper.connect(user1).exitAll(false);

      // Note: there are 3 - 5 seconds delay caused by 'evm_mine' in the following calculation.
      const bal = await rewardsToken.balanceOf(user1Address);
      expect(bal).to.gt(toWei('0.1785')); // 3600 / (86400*7) * 10e18 + 3600 / (86400*7) * 20e18
      expect(bal).to.lt(toWei('0.1789'));

      expect(await stakingRewards1.earned(rewardsToken.address, user1Address)).to.eq(0);
      expect(await stakingRewards2.earned(rewardsToken.address, user1Address)).to.eq(0);

      expect(await stakingRewards1.balanceOf(user1Address)).to.eq(0);
      expect(await stakingRewards2.balanceOf(user1Address)).to.eq(0);
      expect(await token1.balanceOf(user1Address)).to.eq(toWei('100'));
      expect(await token1.balanceOf(stakingToken1.address)).to.eq(0);
      expect(await token2.balanceOf(user1Address)).to.eq(toWei('100'));
      expect(await token2.balanceOf(stakingToken2.address)).to.eq(0);
    });

    it('exits some successfully', async () => {
      await stakingRewardsHelper.connect(user1).exit([stakingRewards1.address], false);

      // Note: there are 3 - 5 seconds delay caused by 'evm_mine' in the following calculation.
      const bal = await rewardsToken.balanceOf(user1Address);
      expect(bal).to.gt(toWei('0.0595')); // 3600 / (86400*7) * 10e18
      expect(bal).to.lt(toWei('0.0597'));

      expect(await stakingRewards1.earned(rewardsToken.address, user1Address)).to.eq(0);
      expect(await stakingRewards2.earned(rewardsToken.address, user1Address)).to.gt(0);

      expect(await stakingRewards1.balanceOf(user1Address)).to.eq(0);
      expect(await stakingRewards2.balanceOf(user1Address)).to.eq(toWei('200'));
      expect(await token1.balanceOf(user1Address)).to.eq(toWei('100'));
      expect(await token1.balanceOf(stakingToken1.address)).to.eq(0);
      expect(await token2.balanceOf(user1Address)).to.eq(0);
      expect(await token2.balanceOf(stakingToken2.address)).to.eq(toWei('100'));
    });

    it('gets user claimable rewards', async () => {
      const userClaimable = await stakingRewardsHelper.getUserClaimableRewards(user1Address, [rewardsToken.address]);
      expect(userClaimable.length).to.eq(1);
      expect(userClaimable[0].rewardToken.rewardTokenAddress).to.eq(rewardsToken.address);
      expect(userClaimable[0].amount).to.gt(toWei('0.1785')); // 3600 / (86400*7) * 10e18 + 3600 / (86400*7) * 20e18
      expect(userClaimable[0].amount).to.lt(toWei('0.1789'));
    });

    it('gets user staked', async () => {
      const userStaked = await stakingRewardsHelper.getUserStaked(user1Address);
      expect(userStaked.length).to.eq(3);
      expect(userStaked[0].stakingTokenAddress).to.eq(stakingToken1.address);
      expect(userStaked[0].balance).to.eq(toWei('200'));
      expect(userStaked[1].stakingTokenAddress).to.eq(stakingToken2.address);
      expect(userStaked[1].balance).to.eq(toWei('200'));
      expect(userStaked[2].stakingTokenAddress).to.eq(stakingTokenWrappedNative.address);
      expect(userStaked[2].balance).to.eq(toWei('0'));

    });
  });

  describe('seize', async () => {
    beforeEach(async () => {
      await stakingToken1.transfer(stakingRewardsHelper.address, toWei('100'));
      await accounts[2].sendTransaction({
        to: stakingRewardsHelper.address,
        value: toWei('1')
      });
    });

    it('seizes successfully', async () => {
      const balance1 = await stakingToken1.balanceOf(adminAddress);
      await stakingRewardsHelper.seize(stakingToken1.address, toWei('100'));
      const balance2 = await stakingToken1.balanceOf(adminAddress);
      expect(balance2.sub(balance1)).to.eq(toWei('100'));
    });

    it('seizes native successfully', async () => {
      const balance1 = await waffle.provider.getBalance(adminAddress);
      const tx = await stakingRewardsHelper.seize(ethers.constants.AddressZero, toWei('1'));
      const receipt = await tx.wait()
      const gas = receipt.gasUsed.mul(tx.gasPrice);
      const balance2 = await waffle.provider.getBalance(adminAddress);
      expect(balance2.add(gas).sub(balance1)).to.eq(toWei('1'));
    });

    it('fails to seize for non-admin', async () => {
      await expect(stakingRewardsHelper.connect(user1).seize(stakingToken1.address, toWei('100'))).to.be.revertedWith('Ownable: caller is not the owner');
    });
  });

  describe('getRewardTokenInfo', async () => {
    it('gets reward token info', async () => {
      const rewardTokenInfo = await stakingRewardsHelper.getRewardTokenInfo(rewardsToken.address);
      expect(rewardTokenInfo.rewardTokenAddress).to.eq(rewardsToken.address);
    });
  });

  describe('getStakingInfo', async () => {
    beforeEach(async () => {
      await Promise.all([
        stakingToken1.setSupplyRatePerBlock(toWei('1.05')),
        stakingToken2.setSupplyRatePerBlock(toWei('1.10')),
        stakingToken1.setExchangeRateStored(toWei('1.15')),
        stakingToken2.setExchangeRateStored(toWei('1.20')),
        token1.connect(user1).approve(stakingRewardsHelper.address, toWei('50')),
        token2.connect(user1).approve(stakingRewardsHelper.address, toWei('100'))
      ]);
      await Promise.all([
        stakingRewardsHelper.connect(user1).stake(token1.address, toWei('50')),
        stakingRewardsHelper.connect(user1).stake(token2.address, toWei('100'))
      ]);
    });

    it('gets staking info', async () => {
      const stakingInfo = await stakingRewardsHelper.getStakingInfo();
      expect(stakingInfo.length).to.eq(3);
      expect(stakingInfo[0].stakingTokenAddress).to.eq(stakingToken1.address);
      expect(stakingInfo[0].totalSupply).to.eq(toWei('57.5')); // 50 * 1.15
      expect(stakingInfo[0].supplyRatePerBlock).to.eq(toWei('1.05'));
      expect(stakingInfo[0].exchangeRate).to.eq(toWei('1.15'));
      expect(stakingInfo[0].rewardRates.length).to.eq(1);
      expect(stakingInfo[0].rewardRates[0].rewardTokenAddress).to.eq(rewardsToken.address);
      expect(stakingInfo[0].rewardRates[0].rate).to.eq(await stakingRewards1.rewardRate(rewardsToken.address));
      expect(stakingInfo[1].stakingTokenAddress).to.eq(stakingToken2.address);
      expect(stakingInfo[1].totalSupply).to.eq(toWei('120')); // 100 * 1.2
      expect(stakingInfo[1].supplyRatePerBlock).to.eq(toWei('1.10'));
      expect(stakingInfo[1].exchangeRate).to.eq(toWei('1.20'));
      expect(stakingInfo[1].rewardRates.length).to.eq(1);
      expect(stakingInfo[1].rewardRates[0].rewardTokenAddress).to.eq(rewardsToken.address);
      expect(stakingInfo[1].rewardRates[0].rate).to.eq(await stakingRewards2.rewardRate(rewardsToken.address));
    });
  });
});
