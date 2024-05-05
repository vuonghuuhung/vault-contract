//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import "./Storage.sol";

contract Governable {
    error AddressZero();
    error NotGovernance();

    Storage public store;

    constructor(address _store) {
        if (_store == address(0)) revert AddressZero();
        store = Storage(_store);
    }

    modifier onlyGovernance() {
        if (store.isGovernance(msg.sender) == false) revert NotGovernance();
        _;
    }

    function setStorage(address _store) public onlyGovernance {
        if (_store == address(0)) revert AddressZero();
        store = Storage(_store);
    }

    function governance() public view returns (address) {
        return store.governance();
    }
}
