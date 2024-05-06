// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

interface IFeeRewardForwarder {
  function poolNotifyFixedTarget(address _token, uint256 _amount) external;
}