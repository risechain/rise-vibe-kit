// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockToken
 * @dev ERC20 token with faucet functionality for testing
 */
contract MockToken is ERC20, Ownable {
    uint8 private _decimals;
    uint256 public constant FAUCET_AMOUNT = 1000 * 10**18; // Base amount before decimals adjustment
    uint256 public constant FAUCET_COOLDOWN = 1 hours;

    mapping(address => uint256) public lastFaucetTime;

    event FaucetUsed(address indexed user, uint256 amount);

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _decimals = decimals_;
        if (initialSupply > 0) {
            _mint(msg.sender, initialSupply);
        }
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Faucet function - mint tokens for testing
     */
    function faucet() external {
        require(
            block.timestamp >= lastFaucetTime[msg.sender] + FAUCET_COOLDOWN,
            "Faucet: Cooldown period not met"
        );

        uint256 amount = FAUCET_AMOUNT / (10 ** (18 - _decimals));
        _mint(msg.sender, amount);
        lastFaucetTime[msg.sender] = block.timestamp;

        emit FaucetUsed(msg.sender, amount);
    }

    /**
     * @dev Mint tokens to specific address (owner only)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

/**
 * @title WETH
 * @dev Wrapped ETH implementation for testing
 */
contract WETH is ERC20, Ownable {
    event Deposit(address indexed from, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);

    constructor() ERC20("Wrapped Ether", "WETH") Ownable(msg.sender) {}

    function deposit() external payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external {
        require(balanceOf(msg.sender) >= amount, "WETH: Insufficient balance");
        _burn(msg.sender, amount);
        payable(msg.sender).transfer(amount);
        emit Withdrawal(msg.sender, amount);
    }

    receive() external payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }
}

/**
 * @title MockTokenFactory
 * @dev Factory for deploying mock tokens (without WETH - uses RISE testnet WETH)
 */
contract MockTokenFactory {
    event TokenDeployed(
        address indexed token,
        string name,
        string symbol,
        uint8 decimals
    );

    address public immutable usdc;
    address public immutable dai;
    address public immutable pepe;

    constructor() {
        // Deploy USDC (6 decimals)
        MockToken usdcContract = new MockToken(
            "USD Coin",
            "USDC",
            6,
            1000000 * 10**6 // 1M USDC initial supply
        );
        usdc = address(usdcContract);
        emit TokenDeployed(usdc, "USD Coin", "USDC", 6);

        // Deploy DAI (18 decimals)
        MockToken daiContract = new MockToken(
            "Dai Stablecoin",
            "DAI",
            18,
            1000000 * 10**18 // 1M DAI initial supply
        );
        dai = address(daiContract);
        emit TokenDeployed(dai, "Dai Stablecoin", "DAI", 18);

        // Deploy PEPE (18 decimals, meme token)
        MockToken pepeContract = new MockToken(
            "Pepe",
            "PEPE",
            18,
            420000000000 * 10**18 // 420B PEPE initial supply (meme number)
        );
        pepe = address(pepeContract);
        emit TokenDeployed(pepe, "Pepe", "PEPE", 18);
    }

    function getAllTokens() external view returns (
        address usdcAddr,
        address daiAddr,
        address pepeAddr
    ) {
        return (usdc, dai, pepe);
    }
}