
task('deploy-staking-reward', 'deploy staking reward contract')
  .addParam('token', 'the staking token')
  .setAction(async (taskArgs, hre) => {
    const multisig = hre.config.namedAccounts['multisig'][hre.network.name]
    const StakingRewardsFactory = await ethers.getContractFactory("StakingRewards")
    const stakingRewards = await StakingRewardsFactory.deploy(taskArgs.token)
    console.log(`staking token: ${taskArgs.token}`)
    console.log(`tx: ${stakingRewards.deployTransaction.hash}`)
    await stakingRewards.deployed()
    console.log(`staking contract: ${stakingRewards.address}`)
    const tx = await stakingRewards.transferOwnership(multisig)
    console.log(`transfer owner to ${multisig}: ${tx.hash}`)
    await tx.wait()
  })




module.exports = {};

