//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

contract Storage {
    error NotGovernance();
    error AddressZero();

    address public governance;
    address public controller;

    constructor() {
        governance = msg.sender;
    }

    modifier onlyGovernance() {
        if (isGovernance(msg.sender) == false) revert NotGovernance();
        _;
    }

    function setGovernance(address _governance) public onlyGovernance {
        if (_governance == address(0)) revert AddressZero();
        governance = _governance;
    }

    function setController(address _controller) public onlyGovernance {
        if (_controller == address(0)) revert AddressZero();
        controller = _controller;
    }

    function isGovernance(address account) public view returns (bool) {
        return account == governance;
    }

    function isController(address account) public view returns (bool) {
        return account == controller;
    }
}
