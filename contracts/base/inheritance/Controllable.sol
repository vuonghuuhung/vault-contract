//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import "./Governable.sol";

contract Controllable is Governable {
    error NotController();
    error NotControllerOrGovernance();

    constructor(address _storage) Governable(_storage) {}

    modifier onlyController() {
        if (store.isController(msg.sender) == false) revert NotController();
        _;
    }

    modifier onlyControllerOrGovernance() {
        if (
            store.isController(msg.sender) == false &&
            store.isGovernance(msg.sender) == false
        ) revert NotControllerOrGovernance();
        _;
    }

    function controller() public view returns (address) {
        return store.controller();
    }
}
