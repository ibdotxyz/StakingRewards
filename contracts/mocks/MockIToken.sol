// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/ITokenInterface.sol";

contract MockIToken is ERC20, ITokenInterface {
    using SafeERC20 for IERC20;

    address private _underlying;
    uint256 private _supplyRate;
    uint256 private _exchangeRate;
    bool private mintFailed;
    bool private redeemFailed;

    constructor(address underlying_) ERC20("Mock Token", "Mock") {
        _mint(msg.sender, 10000**uint256(decimals()));
        _underlying = underlying_;
    }

    function underlying() external view returns (address) {
        return _underlying;
    }

    function setSupplyRatePerBlock(uint256 supplyRate_) external {
        _supplyRate = supplyRate_;
    }

    function supplyRatePerBlock() external view returns (uint256) {
        return _supplyRate;
    }

    function setExchangeRateStored(uint256 exchangeRate_) external {
        _exchangeRate = exchangeRate_;
    }

    function exchangeRateStored() external view returns (uint256) {
        return _exchangeRate;
    }

    function setMintFailed() external {
        mintFailed = true;
    }

    function mint(uint256 mintAmount) external returns (uint256) {
        if (mintFailed) {
            return 1; // Return non-zero to simulate graceful failure.
        }

        IERC20(_underlying).safeTransferFrom(
            msg.sender,
            address(this),
            mintAmount
        );
        uint256 amount = (mintAmount * _exchangeRate) / 1e18;
        _mint(msg.sender, amount);
        return 0;
    }

    function setRedeemFailed() external {
        redeemFailed = true;
    }

    function redeem(uint256 redeemTokens) external returns (uint256) {
        if (redeemFailed) {
            return 1; // Return non-zero to simulate graceful failure.
        }

        _burn(msg.sender, redeemTokens);
        uint256 amount = (redeemTokens * 1e18) / _exchangeRate;
        IERC20(_underlying).safeTransfer(msg.sender, amount);
        return 0;
    }
}
