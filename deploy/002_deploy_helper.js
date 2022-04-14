module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, get} = deployments;
  const {multisig} = await getNamedAccounts();
  const stakingRewardsFactory = (await get('StakingRewardsFactory')).address;
  await deploy('StakingRewardsHelper', {
    from: multisig,
    args: [stakingRewardsFactory],
    log: true,
  });
};
module.exports.tags = ['StakingRewardsHelper'];
module.exports.dependencies = ['StakingRewardsFactory'];
