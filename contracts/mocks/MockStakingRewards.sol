// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../StakingRewards.sol";

contract MockStakingRewards is StakingRewards {
    uint256 private _blockTimestamp;

    constructor(address _stakingToken, address _helperContract)
        StakingRewards(_stakingToken, _helperContract)
    {}

    function setBlockTimestamp(uint256 timestamp) external {
        _blockTimestamp = timestamp;
    }

    function getBlockTimestamp() public view override returns (uint256) {
        return _blockTimestamp;
    }
}
