# Contracts Guide

Learn how to build and deploy smart contracts with Foundry in RISE Vibe Kit.

## 🛠️ Foundry Setup

RISE Vibe Kit uses Foundry for smart contract development:

- **Fast** - Compile and test in milliseconds
- **Native** - Tests written in Solidity
- **Powerful** - Built-in fuzzing, gas reports, and more

## 📁 Contract Structure

```
contracts/
├── src/                 # Your contract source files
│   ├── MyContract.sol
│   └── interfaces/      # Contract interfaces
├── script/             # Deployment scripts
│   └── Deploy.s.sol
├── test/               # Contract tests
│   └── MyContract.t.sol
├── lib/                # Dependencies (OpenZeppelin, etc.)
└── foundry.toml        # Foundry configuration
```

## ✍️ Writing Contracts

### Basic Contract Template

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract MyContract {
    // Events for real-time updates
    event ItemAdded(address indexed user, string content);
    event ItemRemoved(uint256 indexed id);
    
    // State variables
    mapping(uint256 => string) public items;
    uint256 public nextId;
    
    // Functions
    function addItem(string memory content) external {
        items[nextId] = content;
        emit ItemAdded(msg.sender, content);
        nextId++;
    }
}
```

### Key Patterns for RISE

1. **Emit Events Liberally** - Frontend subscribes to these
2. **Keep Functions Simple** - Instant TXs encourage more interactions
3. **Use Latest Solidity** - RISE supports all features

## 🚀 Deployment Scripts

### Basic Deployment Script

```solidity
// script/Deploy.s.sol
pragma solidity ^0.8.23;

import {Script} from "forge-std/Script.sol";
import {MyContract} from "../src/MyContract.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        MyContract myContract = new MyContract();
        
        vm.stopBroadcast();
        
        // Log for sync script
        console.log("MyContract deployed to:", address(myContract));
    }
}
```

### Deploy Command

```bash
npm run deploy-and-sync
```

This command:
1. Deploys your contracts to RISE testnet
2. Extracts addresses and ABIs
3. Updates `frontend/src/contracts/contracts.ts`
4. Your frontend instantly has access!

## 🧪 Testing Contracts

### Basic Test

```solidity
// test/MyContract.t.sol
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {MyContract} from "../src/MyContract.sol";

contract MyContractTest is Test {
    MyContract public myContract;
    
    function setUp() public {
        myContract = new MyContract();
    }
    
    function test_AddItem() public {
        myContract.addItem("Hello RISE!");
        assertEq(myContract.items(0), "Hello RISE!");
    }
}
```

### Run Tests

```bash
cd contracts
forge test          # Run all tests
forge test -vvv     # Verbose output
forge test --gas-report  # Gas usage
```

## 📦 Using OpenZeppelin

Already included! Just import:

```solidity
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor() ERC20("MyToken", "MTK") Ownable(msg.sender) {
        _mint(msg.sender, 1000000 * 10**18);
    }
}
```

## 🔥 Advanced Features

### VRF (Verifiable Random Function)

```solidity
import {IVRFCoordinator} from "./interfaces/IVRF.sol";

contract RandomGame {
    IVRFCoordinator constant VRF = IVRFCoordinator(
        0x9d57aB4517ba97349551C876a01a7580B1338909
    );
    
    function requestRandom() external {
        VRF.requestRandomWords(1);
    }
    
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) 
        external 
    {
        // Called by VRF coordinator
        uint256 randomNumber = randomWords[0];
    }
}
```

### Time Oracle

```solidity
import {ITimeOracle} from "./interfaces/ITimeOracle.sol";

contract TimedAuction {
    ITimeOracle constant TIME = ITimeOracle(
        0x72Fd02e5F05543c477e8187b247E0e7da098fBE8
    );
    
    function getCurrentTime() external view returns (uint256) {
        return TIME.getTime();
    }
}
```

## 💡 Best Practices

### 1. Event-Driven Design
```solidity
// Emit detailed events for frontend
event TradeExecuted(
    address indexed trader,
    uint256 amount,
    uint256 price,
    bool isBuy,
    uint256 timestamp
);
```

### 2. Gas Optimization
```solidity
// RISE has low fees, but still be efficient
uint256 constant PRECISION = 1e18;  // Avoid repeated calculations
```

### 3. Error Messages
```solidity
// Clear errors help frontend development
require(amount > 0, "Amount must be positive");
require(balance >= amount, "Insufficient balance");
```

## 🔧 Common Commands

```bash
# Compile contracts
forge build

# Run tests
forge test

# Deploy to local fork
npm run chain  # Terminal 1
npm run deploy-and-sync  # Terminal 2

# Deploy to RISE testnet
npm run deploy-and-sync

# Verify contract
forge verify-contract <address> <contract> --chain-id 11155931
```

## 🎯 Contract Examples

Check out the template contracts:

- **`ChatApp.sol`** - Message system with karma
- **`TokenLaunchpad.sol`** - Create and trade tokens
- **`FrenPet.sol`** - NFT game with VRF battles
- **`LeverageTrading.sol`** - Perpetual futures

Each demonstrates different patterns and RISE features.

Ready to build your own? Follow the [Tutorial](./tutorial.md) for a complete walkthrough!