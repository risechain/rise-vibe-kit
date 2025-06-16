// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    uint256 private storedValue;
    
    event ValueChanged(uint256 oldValue, uint256 newValue);
    
    function set(uint256 value) public {
        uint256 oldValue = storedValue;
        storedValue = value;
        emit ValueChanged(oldValue, value);
    }
    
    function get() public view returns (uint256) {
        return storedValue;
    }
    
    function increment() public {
        uint256 oldValue = storedValue;
        storedValue = storedValue + 1;
        emit ValueChanged(oldValue, storedValue);
    }
}