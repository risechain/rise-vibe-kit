// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";

// Import your contract here 

contract Setup is Test {
    
    address public user1 = address(0);
    address public user2 = address(2);

    function setUp() public virtual {
        // Deploy your contract here 

    }


}
