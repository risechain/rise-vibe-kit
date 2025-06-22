# Smart Contract Development Guide

## Overview

RISE Vibe Kit uses Foundry for smart contract development, testing, and deployment. This guide covers how to create, test, and deploy smart contracts that integrate seamlessly with the frontend.

## Contract Structure

```
contracts/
├── src/                        # Contract source files
│   ├── MyContract.sol         # Your contracts
│   └── interfaces/            # Shared interfaces
│       ├── IVRF.sol          # VRF interface
│       ├── ITimeOracle.sol   # Time oracle
│       └── Stork/            # Price feed interfaces
│
├── script/                    # Deployment scripts
│   ├── Deploy.s.sol          # Deployment script
│   └── DeployMultiple.s.sol  # Multi-contract deployment
│
├── test/                      # Contract tests
│   └── MyContract.t.sol      # Test files
│
├── lib/                       # Dependencies (git submodules)
│   ├── forge-std/            # Foundry standard library
│   └── openzeppelin-contracts/ # OpenZeppelin contracts
│
└── foundry.toml              # Foundry configuration
```

## Creating a New Contract

### 1. Basic Contract Template

```solidity
// contracts/src/MyToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    // Events
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    
    // State variables
    uint256 public constant MAX_SUPPLY = 1_000_000 * 10**18; // 1M tokens
    uint256 public mintedSupply;
    
    // Constructor
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        // Mint initial supply to owner
        _mint(initialOwner, 100_000 * 10**18); // 100k tokens
        mintedSupply = 100_000 * 10**18;
    }
    
    // Public functions
    function mint(address to, uint256 amount) external onlyOwner {
        require(mintedSupply + amount <= MAX_SUPPLY, "Exceeds max supply");
        
        _mint(to, amount);
        mintedSupply += amount;
        
        emit TokensMinted(to, amount);
    }
    
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        mintedSupply -= amount;
        
        emit TokensBurned(msg.sender, amount);
    }
}
```

### 2. Contract with RISE Features

```solidity
// contracts/src/GameContract.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./interfaces/IVRF.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract GameContract is ReentrancyGuard {
    // RISE VRF integration
    IVRF public immutable vrf;
    
    // Game state
    struct Game {
        address player;
        uint256 bet;
        uint256 requestId;
        bool resolved;
    }
    
    mapping(uint256 => Game) public games;
    mapping(address => uint256[]) public playerGames;
    
    // Events
    event GameStarted(uint256 indexed gameId, address indexed player, uint256 bet);
    event GameResolved(uint256 indexed gameId, address indexed player, bool won, uint256 payout);
    
    constructor(address _vrf) {
        vrf = IVRF(_vrf);
    }
    
    function startGame() external payable nonReentrant {
        require(msg.value >= 0.01 ether, "Minimum bet is 0.01 ETH");
        
        // Request randomness from RISE VRF
        uint256 requestId = vrf.requestRandomness();
        
        // Create game
        uint256 gameId = uint256(keccak256(abi.encodePacked(requestId, block.timestamp)));
        games[gameId] = Game({
            player: msg.sender,
            bet: msg.value,
            requestId: requestId,
            resolved: false
        });
        
        playerGames[msg.sender].push(gameId);
        
        emit GameStarted(gameId, msg.sender, msg.value);
    }
    
    // Called by VRF oracle
    function fulfillRandomness(uint256 requestId, uint256 randomness) external {
        require(msg.sender == address(vrf), "Only VRF can fulfill");
        
        // Find game with this request ID
        uint256 gameId = findGameByRequestId(requestId);
        require(gameId != 0, "Game not found");
        
        Game storage game = games[gameId];
        require(!game.resolved, "Game already resolved");
        
        // Simple 50/50 game
        bool won = (randomness % 2) == 0;
        game.resolved = true;
        
        if (won) {
            // Double the bet
            uint256 payout = game.bet * 2;
            payable(game.player).transfer(payout);
            emit GameResolved(gameId, game.player, true, payout);
        } else {
            emit GameResolved(gameId, game.player, false, 0);
        }
    }
    
    function findGameByRequestId(uint256 requestId) internal view returns (uint256) {
        // In production, use more efficient lookup
        // This is simplified for example
        return uint256(keccak256(abi.encodePacked(requestId, block.timestamp)));
    }
}
```

## Writing Deployment Scripts

### 1. Single Contract Deployment

```solidity
// contracts/script/DeployMyToken.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/MyToken.sol";

contract DeployMyToken is Script {
    function run() external {
        // Load private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying MyToken with deployer:", deployer);
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy contract
        MyToken token = new MyToken(
            "My Token",      // name
            "MTK",          // symbol
            deployer        // initial owner
        );
        
        console.log("MyToken deployed at:", address(token));
        console.log("Initial supply:", token.balanceOf(deployer));
        
        vm.stopBroadcast();
    }
}
```

### 2. Multi-Contract Deployment

```solidity
// contracts/script/DeployAll.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/MyToken.sol";
import "../src/GameContract.sol";
import "../src/Staking.sol";

contract DeployAll is Script {
    // Deployed contracts
    MyToken public token;
    GameContract public game;
    Staking public staking;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy token first
        token = new MyToken("My Token", "MTK", deployer);
        console.log("Token deployed:", address(token));
        
        // Deploy game with VRF
        address vrfAddress = getVRFAddress();
        game = new GameContract(vrfAddress);
        console.log("Game deployed:", address(game));
        
        // Deploy staking with token reference
        staking = new Staking(address(token));
        console.log("Staking deployed:", address(staking));
        
        // Post-deployment setup
        setupContracts();
        
        vm.stopBroadcast();
        
        // Log deployment summary
        logDeployment();
    }
    
    function setupContracts() internal {
        // Transfer some tokens to staking contract
        token.transfer(address(staking), 10_000 * 10**18);
        
        // Fund game contract
        payable(address(game)).transfer(1 ether);
    }
    
    function getVRFAddress() internal view returns (address) {
        // RISE testnet VRF
        if (block.chainid == 66666) {
            return 0x9d57aB4517ba97349551C876a01a7580B1338909;
        }
        // Local development
        return address(0x1234567890123456789012345678901234567890);
    }
    
    function logDeployment() internal view {
        console.log("\n=== Deployment Summary ===");
        console.log("Token:", address(token));
        console.log("Game:", address(game));
        console.log("Staking:", address(staking));
        console.log("=======================\n");
    }
}
```

## Testing Contracts

### 1. Basic Test Structure

```solidity
// contracts/test/MyToken.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/MyToken.sol";

contract MyTokenTest is Test {
    MyToken public token;
    address public owner;
    address public user1;
    address public user2;
    
    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        
        token = new MyToken("Test Token", "TEST", owner);
    }
    
    function test_InitialSupply() public {
        assertEq(token.balanceOf(owner), 100_000 * 10**18);
        assertEq(token.totalSupply(), 100_000 * 10**18);
    }
    
    function test_Mint() public {
        uint256 mintAmount = 1000 * 10**18;
        
        token.mint(user1, mintAmount);
        
        assertEq(token.balanceOf(user1), mintAmount);
        assertEq(token.mintedSupply(), 100_000 * 10**18 + mintAmount);
    }
    
    function testFail_MintExceedsMaxSupply() public {
        uint256 tooMuch = 1_000_000 * 10**18; // Would exceed max
        token.mint(user1, tooMuch);
    }
    
    function test_Burn() public {
        uint256 burnAmount = 1000 * 10**18;
        
        // First transfer some tokens to user1
        token.transfer(user1, burnAmount);
        
        // User1 burns tokens
        vm.prank(user1);
        token.burn(burnAmount);
        
        assertEq(token.balanceOf(user1), 0);
        assertEq(token.mintedSupply(), 100_000 * 10**18 - burnAmount);
    }
}
```

### 2. Advanced Testing Patterns

```solidity
// contracts/test/GameContract.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "../src/GameContract.sol";
import "../src/interfaces/IVRF.sol";

// Mock VRF for testing
contract MockVRF is IVRF {
    uint256 public nextRequestId = 1;
    mapping(uint256 => address) public requests;
    
    function requestRandomness() external returns (uint256) {
        uint256 requestId = nextRequestId++;
        requests[requestId] = msg.sender;
        return requestId;
    }
    
    function fulfillRandomness(uint256 requestId, uint256 randomness) external {
        address requester = requests[requestId];
        GameContract(requester).fulfillRandomness(requestId, randomness);
    }
}

contract GameContractTest is Test {
    GameContract public game;
    MockVRF public vrf;
    
    address public player1 = address(0x1);
    address public player2 = address(0x2);
    
    function setUp() public {
        vrf = new MockVRF();
        game = new GameContract(address(vrf));
        
        // Fund test accounts
        vm.deal(player1, 10 ether);
        vm.deal(player2, 10 ether);
        vm.deal(address(game), 100 ether); // Fund game contract
    }
    
    function test_StartGame() public {
        vm.prank(player1);
        game.startGame{value: 0.1 ether}();
        
        // Check game was created
        uint256 gameId = uint256(keccak256(abi.encodePacked(uint256(1), block.timestamp)));
        (address player, uint256 bet, uint256 requestId, bool resolved) = game.games(gameId);
        
        assertEq(player, player1);
        assertEq(bet, 0.1 ether);
        assertEq(requestId, 1);
        assertFalse(resolved);
    }
    
    function test_GameResolution_Win() public {
        // Start game
        vm.prank(player1);
        game.startGame{value: 0.1 ether}();
        
        uint256 balanceBefore = player1.balance;
        
        // Simulate VRF callback with even number (win)
        vrf.fulfillRandomness(1, 2); // Even = win
        
        // Check player won
        assertEq(player1.balance, balanceBefore + 0.2 ether);
    }
    
    function test_GameResolution_Loss() public {
        // Start game
        vm.prank(player1);
        game.startGame{value: 0.1 ether}();
        
        uint256 balanceBefore = player1.balance;
        
        // Simulate VRF callback with odd number (loss)
        vrf.fulfillRandomness(1, 3); // Odd = loss
        
        // Check player lost
        assertEq(player1.balance, balanceBefore);
    }
    
    function test_Fuzz_MultipleGames(uint8 numGames) public {
        vm.assume(numGames > 0 && numGames <= 10);
        
        for (uint i = 0; i < numGames; i++) {
            vm.prank(player1);
            game.startGame{value: 0.1 ether}();
        }
        
        // Check all games created
        uint256[] memory playerGames = game.getPlayerGames(player1);
        assertEq(playerGames.length, numGames);
    }
}
```

### 3. Fork Testing

Test against RISE testnet:

```solidity
// contracts/test/ForkTest.t.sol
contract ForkTest is Test {
    string RISE_RPC = "https://testnet.rise.chain";
    uint256 riseFork;
    
    function setUp() public {
        riseFork = vm.createFork(RISE_RPC);
        vm.selectFork(riseFork);
    }
    
    function test_InteractWithDeployedContract() public {
        // Test against real deployed contracts
        address deployedToken = 0x1234...; // Your deployed address
        
        MyToken token = MyToken(deployedToken);
        uint256 supply = token.totalSupply();
        
        assertTrue(supply > 0);
    }
}
```

## Gas Optimization

### 1. Storage Patterns

```solidity
contract OptimizedStorage {
    // Pack structs to use fewer storage slots
    struct User {
        address addr;      // 20 bytes
        uint96 balance;    // 12 bytes - fits in one slot with address
        uint128 rewards;   // 16 bytes
        uint128 lastUpdate;// 16 bytes - fits in one slot with rewards
    }
    
    // Use mappings instead of arrays when possible
    mapping(address => User) public users;
    
    // Cache array length in loops
    function processUsers(address[] calldata userList) external {
        uint256 length = userList.length;
        for (uint256 i; i < length; ) {
            // Process user
            unchecked { ++i; }
        }
    }
}
```

### 2. Gas-Efficient Patterns

```solidity
contract GasEfficient {
    // Use custom errors instead of revert strings
    error InsufficientBalance(uint256 requested, uint256 available);
    error Unauthorized(address caller);
    
    // Use modifiers sparingly
    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized(msg.sender);
        _;
    }
    
    // Batch operations
    function batchTransfer(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        uint256 length = recipients.length;
        require(length == amounts.length, "Length mismatch");
        
        for (uint256 i; i < length; ) {
            _transfer(recipients[i], amounts[i]);
            unchecked { ++i; }
        }
    }
}
```

## Security Best Practices

### 1. Common Patterns

```solidity
contract SecureContract is ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    
    // State variables
    uint256 private constant MAX_UINT = type(uint256).max;
    mapping(address => uint256) private balances;
    
    // Events
    event Deposit(address indexed user, uint256 amount);
    event Withdrawal(address indexed user, uint256 amount);
    
    // Checks-Effects-Interactions pattern
    function withdraw(uint256 amount) external nonReentrant whenNotPaused {
        // Checks
        require(amount > 0, "Amount must be positive");
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Effects
        balances[msg.sender] -= amount;
        
        // Interactions
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawal(msg.sender, amount);
    }
    
    // Safe external calls
    function safeTransferToken(
        IERC20 token,
        address to,
        uint256 amount
    ) external onlyOwner {
        // Uses SafeERC20 to handle tokens that don't return bool
        token.safeTransfer(to, amount);
    }
}
```

### 2. Access Control

```solidity
contract AccessControlled is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }
    
    function sensitiveOperation() external onlyRole(ADMIN_ROLE) {
        // Admin only
    }
    
    function regularOperation() external onlyRole(OPERATOR_ROLE) {
        // Operator or admin
    }
}
```

## Deployment Process

### 1. Local Development

```bash
# Start local node
npm run chain

# Deploy to local
npm run deploy-and-sync -- -n localhost
```

### 2. Testnet Deployment

```bash
# Set up environment
export PRIVATE_KEY=your_private_key
export RISE_TESTNET_RPC=https://testnet.rise.chain

# Deploy to testnet
npm run deploy-and-sync -- -n rise_testnet

# Verify contract (if supported)
forge verify-contract \
  --chain-id 66666 \
  --compiler-version v0.8.23 \
  0xYourContractAddress \
  src/MyContract.sol:MyContract
```

### 3. Mainnet Deployment

```bash
# Double-check everything
forge test
forge coverage

# Deploy to mainnet
npm run deploy-and-sync -- -n rise_mainnet -v

# Monitor deployment
cast receipt 0xDeploymentTxHash --rpc-url $RISE_MAINNET_RPC
```

## Integration with Frontend

After deployment, contracts are automatically available in the frontend:

### 1. Auto-Generated Types

```typescript
// frontend/src/contracts/contracts.ts
export const contracts = {
  MyToken: {
    address: '0x...',
    abi: [...],
    deploymentTxHash: '0x...'
  }
}
```

### 2. Hook Creation

```typescript
// frontend/src/hooks/useMyToken.ts
import { useContractFactory } from './useContractFactory';
import { contracts } from '@/contracts/contracts';

export function useMyToken() {
  return useContractFactory(
    contracts.MyToken.address,
    contracts.MyToken.abi
  );
}
```

### 3. Usage in Components

```typescript
const { write, read } = useMyToken();

// Read
const balance = await read.balanceOf(address);

// Write
const receipt = await write.transfer(recipient, amount);
```

## Troubleshooting

### Common Issues

1. **Compilation Errors**
   ```bash
   # Clear cache and rebuild
   forge clean
   forge build
   ```

2. **Import Errors**
   ```bash
   # Update dependencies
   forge update
   
   # Check remappings
   cat remappings.txt
   ```

3. **Deployment Fails**
   ```bash
   # Check balance
   cast balance $DEPLOYER_ADDRESS --rpc-url $RPC_URL
   
   # Estimate gas
   forge script script/Deploy.s.sol --rpc-url $RPC_URL --estimate-gas
   ```

### Debugging Tips

1. **Use console.log in Tests**
   ```solidity
   import "forge-std/console.sol";
   
   function test_Debug() public {
       console.log("Value:", someValue);
       console.log("Address:", someAddress);
   }
   ```

2. **Trace Transactions**
   ```bash
   cast run 0xTxHash --rpc-url $RPC_URL
   ```

3. **Fork Testing**
   ```bash
   forge test --fork-url $RISE_TESTNET_RPC -vvv
   ```

## Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [OpenZeppelin Docs](https://docs.openzeppelin.com/)
- [Solidity Docs](https://docs.soliditylang.org/)
- [RISE Documentation](https://docs.rise.chain/)