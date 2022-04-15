module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, execute} = deployments;
  const {deployer, multisig} = await getNamedAccounts();
  await deploy('StakingRewardsFactory', {
    from: deployer,
    log: true,
  });
  await execute('StakingRewardsFactory', { from: deployer}, 'transferOwnership', multisig);
};
module.exports.tags = ['StakingRewardsFactory'];
