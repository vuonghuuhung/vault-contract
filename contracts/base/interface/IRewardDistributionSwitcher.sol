// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

abstract contract IRewardDistributionSwitcher {
    function switchingAllowed(address) external virtual returns (bool);

    function returnOwnership(address poolAddr) external virtual;

    function enableSwitchers(address[] calldata switchers) external virtual;

    function setSwithcer(address switcher, bool allowed) external virtual;

    function setPoolRewardDistribution(
        address poolAddr,
        address newRewardDistributor
    ) external virtual;
}
