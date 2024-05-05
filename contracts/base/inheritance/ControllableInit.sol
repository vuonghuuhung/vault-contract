//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import "./GovernableInit.sol";

// A clone of Governable supporting the Initializable interface and pattern
contract ControllableInit is GovernableInit {
    error NotController();
    error NotControllerOrGovernance();

    constructor() {}

    function initialize(address _storage) public override onlyInitializing {
        GovernableInit.initialize(_storage);
    }

    modifier onlyController() {
        if (Storage(_storage()).isController(msg.sender) == false)
            revert NotController();
        _;
    }

    modifier onlyControllerOrGovernance() {
        if (
            Storage(_storage()).isController(msg.sender) == false &&
            Storage(_storage()).isGovernance(msg.sender) == false
        ) revert NotControllerOrGovernance();
        _;
    }

    function controller() public view returns (address) {
        return Storage(_storage()).controller();
    }
}
