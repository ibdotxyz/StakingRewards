// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract StakingRewards is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ========== STATE VARIABLES ========== */

    IERC20 public stakingToken;
    address[] public rewardsTokens;
    mapping(address => bool) public rewardsTokensMap;
    mapping(address => uint256) public periodFinish;
    mapping(address => uint256) public rewardRate;
    mapping(address => uint256) public rewardsDuration;
    mapping(address => uint256) public lastUpdateTime;
    mapping(address => uint256) public rewardPerTokenStored;

    mapping(address => mapping(address => uint256)) public rewardPerTokenPaid;
    mapping(address => mapping(address => uint256)) public rewards;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    /* ========== CONSTRUCTOR ========== */

    constructor(address _stakingToken) {
        stakingToken = IERC20(_stakingToken);
    }

    /* ========== VIEWS ========== */

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function lastTimeRewardApplicable(address _rewardsToken)
        external
        view
        returns (uint256)
    {
        return
            getBlockTimestamp() < periodFinish[_rewardsToken]
                ? getBlockTimestamp()
                : periodFinish[_rewardsToken];
    }

    function rewardPerToken(address _rewardsToken)
        external
        view
        returns (uint256)
    {
        // Return 0 if the rewards token is not supported.
        if (!rewardsTokensMap[_rewardsToken]) {
            return 0;
        }

        if (_totalSupply == 0) {
            return rewardPerTokenStored[_rewardsToken];
        }
        return
            rewardPerTokenStored[_rewardsToken] +
            (((this.lastTimeRewardApplicable(_rewardsToken) -
                lastUpdateTime[_rewardsToken]) *
                rewardRate[_rewardsToken] *
                1e18) / _totalSupply);
    }

    function earned(address _rewardsToken, address account)
        external
        view
        returns (uint256)
    {
        // Return 0 if the rewards token is not supported.
        if (!rewardsTokensMap[_rewardsToken]) {
            return 0;
        }

        return
            (_balances[account] *
                (this.rewardPerToken(_rewardsToken) -
                    rewardPerTokenPaid[_rewardsToken][account])) /
            1e18 +
            rewards[_rewardsToken][account];
    }

    function getRewardForDuration(address _rewardsToken)
        external
        view
        returns (uint256)
    {
        return rewardRate[_rewardsToken] * rewardsDuration[_rewardsToken];
    }

    function getBlockTimestamp() public view virtual returns (uint256) {
        return block.timestamp;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function stake(uint256 amount)
        external
        nonReentrant
        whenNotPaused
        updateReward(msg.sender)
    {
        require(amount > 0, "invalid amount");
        _totalSupply = _totalSupply + amount;
        _balances[msg.sender] = _balances[msg.sender] + amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function stakeFor(address account, uint256 amount)
        external
        nonReentrant
        whenNotPaused
        updateReward(account)
    {
        require(account != address(0), "invalid account");
        require(amount > 0, "invalid amount");
        _totalSupply = _totalSupply + amount;
        _balances[account] = _balances[account] + amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(account, amount);
    }

    function withdraw(uint256 amount)
        external
        nonReentrant
        updateReward(msg.sender)
    {
        require(amount > 0, "invalid amount");
        _totalSupply = _totalSupply - amount;
        _balances[msg.sender] = _balances[msg.sender] - amount;
        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function getReward(address account)
        external
        nonReentrant
        updateReward(account)
    {
        for (uint256 i = 0; i < rewardsTokens.length; i++) {
            uint256 reward = rewards[rewardsTokens[i]][account];
            uint256 remain = IERC20(rewardsTokens[i]).balanceOf(address(this));
            if (reward > 0 && reward <= remain) {
                rewards[rewardsTokens[i]][account] = 0;
                IERC20(rewardsTokens[i]).safeTransfer(account, reward);
                emit RewardPaid(account, rewardsTokens[i], reward);
            }
        }
    }

    function exit() external {
        this.withdraw(_balances[msg.sender]);
        this.getReward(msg.sender);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function notifyRewardAmount(address rewardsToken, uint256 reward)
        external
        onlyOwner
        updateReward(address(0))
    {
        require(rewardsTokensMap[rewardsToken], "reward token not supported");

        if (getBlockTimestamp() >= periodFinish[rewardsToken]) {
            rewardRate[rewardsToken] = reward / rewardsDuration[rewardsToken];
        } else {
            uint256 remaining = periodFinish[rewardsToken] -
                getBlockTimestamp();
            uint256 leftover = remaining * rewardRate[rewardsToken];
            rewardRate[rewardsToken] =
                (reward + leftover) /
                rewardsDuration[rewardsToken];
        }

        lastUpdateTime[rewardsToken] = getBlockTimestamp();
        periodFinish[rewardsToken] =
            getBlockTimestamp() +
            rewardsDuration[rewardsToken];
        emit RewardAdded(rewardsToken, reward);
    }

    function recoverToken(address tokenAddress, uint256 tokenAmount)
        external
        onlyOwner
    {
        require(
            tokenAddress != address(stakingToken),
            "cannot withdraw staking token"
        );
        IERC20(tokenAddress).safeTransfer(owner(), tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    function setRewardsDuration(address rewardsToken, uint256 duration)
        external
        onlyOwner
    {
        require(rewardsTokensMap[rewardsToken], "reward token not supported");
        require(
            getBlockTimestamp() > periodFinish[rewardsToken],
            "previous rewards not complete"
        );
        rewardsDuration[rewardsToken] = duration;
        emit RewardsDurationUpdated(rewardsToken, duration);
    }

    function addRewardsToken(address rewardsToken, uint256 duration)
        external
        onlyOwner
    {
        require(
            !rewardsTokensMap[rewardsToken],
            "rewards token already supported"
        );

        rewardsTokens.push(rewardsToken);
        rewardsTokensMap[rewardsToken] = true;
        rewardsDuration[rewardsToken] = duration;
        emit RewardsTokenAdded(rewardsToken);
        emit RewardsDurationUpdated(rewardsToken, duration);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /* ========== MODIFIERS ========== */

    modifier updateReward(address user) {
        for (uint256 i = 0; i < rewardsTokens.length; i++) {
            address token = rewardsTokens[i];
            rewardPerTokenStored[token] = this.rewardPerToken(token);
            lastUpdateTime[token] = this.lastTimeRewardApplicable(token);
            if (user != address(0)) {
                rewards[token][user] = this.earned(token, user);
                rewardPerTokenPaid[token][user] = rewardPerTokenStored[token];
            }
        }
        _;
    }

    /* ========== EVENTS ========== */

    event RewardAdded(address rewardsToken, uint256 reward);
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(
        address indexed user,
        address rewardsToken,
        uint256 reward
    );
    event RewardsDurationUpdated(address rewardsToken, uint256 newDuration);
    event Recovered(address token, uint256 amount);
    event RewardsTokenAdded(address rewardsToken);
}
