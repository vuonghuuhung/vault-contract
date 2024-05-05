// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

interface IdleTokenHelper {
    function getMintingPrice(
        address idleYieldToken
    ) external view returns (uint256 mintingPrice);

    function getRedeemPrice(
        address idleYieldToken
    ) external view returns (uint256 redeemPrice);

    function getRedeemPrice(
        address idleYieldToken,
        address user
    ) external view returns (uint256 redeemPrice);
}
