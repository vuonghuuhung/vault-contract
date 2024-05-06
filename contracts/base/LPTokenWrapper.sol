// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract LPTokenWrapper {
    using SafeERC20 for IERC20;

    IERC20 public lpToken;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function stake(uint256 amount) virtual public {
        _totalSupply = _totalSupply + (amount);
        _balances[msg.sender] = _balances[msg.sender] + (amount);
        lpToken.safeTransferFrom(msg.sender, address(this), amount);
    }

    function withdraw(uint256 amount) virtual public {
        _totalSupply = _totalSupply - (amount);
        _balances[msg.sender] = _balances[msg.sender] - (amount);
        lpToken.safeTransfer(msg.sender, amount);
    }

    // Harvest migrate
    // only called by the migrateStakeFor in the MigrationHelperRewardPool
    function migrateStakeFor(address target, uint256 amountNewShare) virtual internal {
        _totalSupply = _totalSupply + (amountNewShare);
        _balances[target] = _balances[target] + (amountNewShare);
    }
}
