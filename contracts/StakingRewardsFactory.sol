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
            StakingRewards sr = new StakingRewards(stakingTokens[i]);
            sr.transferOwnership(msg.sender);

            stakingRewards.push(address(sr));
            stakingRewardsMap[stakingTokens[i]] = address(sr);
            emit StakingRewardsCreated(address(sr), stakingTokens[i]);
        }
    }
}
