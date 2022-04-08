// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./StakingRewards.sol";

contract StakingRewardsFactory is Ownable {
    /// @notice The list of staking rewards contract
    address[] public stakingRewards;

    /// @notice The staking rewards contract mapping
    mapping(address => address) public stakingRewardsMap;

    /**
     * @notice Emitted when a staking rewards contract is deployed
     */
    event StakingRewardsCreated(
        address indexed stakingRewards,
        address indexed stakingToken
    );

    /**
     * @notice Emitted when a staking rewards contract is removed
     */
    event StakingRewardsRemoved(address indexed stakingToken);

    /**
     * @notice Return the amount of staking reward contracts.
     * @return The amount of staking reward contracts
     */
    function getStakingRewardsCount() external view returns (uint256) {
        return stakingRewards.length;
    }

    /**
     * @notice Create staking reward contracts.
     * @param stakingTokens The staking token list
     */
    function createStakingRewards(address[] calldata stakingTokens)
        external
        onlyOwner
    {
        for (uint256 i = 0; i < stakingTokens.length; i++) {
            require(
                stakingRewardsMap[stakingTokens[i]] == address(0),
                "staking rewards contract already exist"
            );
            StakingRewards sr = new StakingRewards(stakingTokens[i]);
            sr.transferOwnership(msg.sender);

            stakingRewards.push(address(sr));
            stakingRewardsMap[stakingTokens[i]] = address(sr);
            emit StakingRewardsCreated(address(sr), stakingTokens[i]);
        }
    }

    /**
     * @notice Remove a staking reward contract.
     * @param stakingToken The staking token
     */
    function removeStakingRewards(address stakingToken) external onlyOwner {
        require(
            stakingRewardsMap[stakingToken] != address(0),
            "staking rewards contract not exist"
        );

        for (uint256 i = 0; i < stakingRewards.length; i++) {
            if (stakingRewardsMap[stakingToken] == stakingRewards[i]) {
                stakingRewards[i] = stakingRewards[stakingRewards.length - 1];
                delete stakingRewards[stakingRewards.length - 1];
                stakingRewards.pop();
                break;
            }
        }
        stakingRewardsMap[stakingToken] = address(0);
        emit StakingRewardsRemoved(stakingToken);
    }
}
