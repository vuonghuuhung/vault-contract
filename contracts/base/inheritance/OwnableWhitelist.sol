// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract OwnableWhitelist is Ownable {
    mapping(address => bool) public whitelist;

    constructor() Ownable(msg.sender) {
        whitelist[msg.sender] = true;
    }

    modifier onlyWhitelisted() {
        require(whitelist[msg.sender], "not allowed");
        _;
    }

    function setWhitelist(address target, bool isWhitelisted) public onlyOwner {
        whitelist[target] = isWhitelisted;
    }
}
