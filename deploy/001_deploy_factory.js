module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {multisig} = await getNamedAccounts();
  await deploy('StakingRewardsFactory', {
    from: multisig,
    log: true,
  });
};
module.exports.tags = ['StakingRewardsFactory'];
