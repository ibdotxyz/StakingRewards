module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, get, execute} = deployments;
  const {deployer, multisig, wrappedNative} = await getNamedAccounts();
  const stakingRewardsFactory = (await get('StakingRewardsFactory')).address;
  await deploy('StakingRewardsHelper', {
    from: deployer,
    args: [stakingRewardsFactory, wrappedNative],
    log: true,
  });

  await execute('StakingRewardsHelper', { from: deployer}, 'transferOwnership', multisig);
};
module.exports.tags = ['StakingRewardsHelper'];
//module.exports.dependencies = ['StakingRewardsFactory'];
