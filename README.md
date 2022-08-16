# Iron Bank Staking Rewards

Iron Bank staking rewards is a system that distributes rewards to iToken stakers. Users need to supply assets into Iron Bank and stake their received iToken to corresponding staking reward contract to earn rewards. Please note that this means the supplied assets can't be used as collateral since the iToken will be transferred from users.

There are 3 components associated with Iron Bank staking rewards system.

- `StakingRewardsFactory`: The factory that creates all the staking reward contracts.
- `StakingRewards`: The contract that handles the main logic.
- `StakingRewardsHelper`: The contract that helps users stake, unstake, and claim rewards.

## StakingRewardsFactory

### View Functions

#### getAllStakingRewards

Get all the staking reward contracts created by this factory.

#### getStakingRewards

Get the staking reward contract address given the staking token (iToken).

#### getStakingToken

Get the staking token (iToken) address given the underlying.

### Mutative Functions

All the mutative functions in `StakingRewardsFactory` are admin functions.

#### createStakingRewards

Create staking reward contracts by providing a list of iToken addresses and the staking reward helper contract address. The helper contract is not necessary at this moment and could be set in each staking reward contract later.

#### removeStakingRewards

Remove a staking reward contract given the staking token. This only updates the record in the factory. It won't stop the rewards distribution in the staking reward contract.

## StakingRewards

### View Functions

#### totalSupply

Get the total amount of the staking token (iToken) staked in the contract.

#### balanceOf

Get user balance of the staking token staked in the contract.

#### earned

Get the user claimable reward token amount.

#### getRewardRate

Get the reward rate of one reward token.

#### getRewardForDuration

Get total reward amount in one epoch. (rewardRate \* rewardsDuration)

#### getAllRewardsTokens

Get all the reward tokens address.

#### getStakingToken

Get the staking token (iToken) address of this staking reward contract.

### Mutative Functions

#### stake

Stake the staking token (iToken) into the staking reward contract.

#### stakeFor

Helper contract stakes the staking token into the staking reward contract on behalf of users.

#### withdraw

Withdraw the staking token (iToken) from the staking reward contract.

#### withdrawFor

Helper contract withdraws the staking token from the staking reward contract on behalf of users.

#### getReward

Claim rewards for the message sender.

#### getRewardFor

Helper contract claims rewards on behalf of users.

#### exit

Withdraw all the staking tokens (iToken) and claim all rewards.

#### notifyRewardAmount

_This is a admin function._

Set new reward amount for the next epoch.

#### setRewardsDuration

_This is a admin function._

Update the epoch reward duration.

#### addRewardsToken

_This is a admin function._

Support new reward token.

#### setHelperContract

_This is a admin function._

Set the helper contract.

## StakingRewardsHelper

### View Functions

#### getRewardTokenInfo

Get the reward token info.

#### getUserClaimableRewards

Get user claimable rewards.

#### getUserStaked

Get user staked info.

#### getStakingInfo

Get all the staking info.

### Mutative Functions

#### stake

Supply assets into Iron Bank and stake the corresponding iToken into the staking reward contract for users.

#### unstake

Unstake iToken from the staking reward contract and redeem the underlying from Iron Bank for users.

#### exit

Exit one staking reward contract for users.

#### exitAll

Exit all staking reward contracts for users.

#### claimRewards

Claim rewards of staking reward contracts for users.

#### claimAllRewards

Claim all rewards for users.
