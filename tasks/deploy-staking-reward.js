
task('deploy-staking-reward', 'deploy staking reward contract')
  .addParam('token', 'the staking token')
  .setAction(async (taskArgs, hre) => {
    const StakingRewardsFactory = await ethers.getContractFactory("StakingRewards")
    const stakingRewards = await StakingRewardsFactory.deploy(taskArgs.token)
    console.log(`staking token: ${taskArgs.token}`)
    console.log(`tx: ${stakingRewards.deployTransaction.hash}`)
    await stakingRewards.deployed()
    console.log(`staking contract: ${stakingRewards.address}`)
  })

module.exports = {};

