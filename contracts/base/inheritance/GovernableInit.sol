//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "./Storage.sol";

// A clone of Governable supporting the Initializable interface and pattern
contract GovernableInit is ReentrancyGuardUpgradeable {
    error NotGovernance();
    error EIP1967SlotError();
    error AddressZero();

    bytes32 internal constant _STORAGE_SLOT =
        0xa7ec62784904ff31cbcc32d09932a58e7f1e4476e1d041995b37c917990b16dc;

    modifier onlyGovernance() {
        if (governance() != msg.sender) revert NotGovernance();
        _;
    }

    constructor() {
        __ReentrancyGuard_init();
    }

    function initialize(address _store) public virtual onlyInitializing {
        _setStorage(_store);
    }

    function _setStorage(address newStorage) private {
        bytes32 slot = _STORAGE_SLOT;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            sstore(slot, newStorage)
        }
    }

    function setStorage(address _store) public onlyGovernance {
        if (_store == address(0)) revert AddressZero();
        _setStorage(_store);
    }

    function _storage() internal view returns (address str) {
        bytes32 slot = _STORAGE_SLOT;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            str := sload(slot)
        }
    }

    function governance() public view returns (address) {
        return Storage(_storage()).governance();
    }
}
