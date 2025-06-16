// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MemeToken is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    
    constructor(
        string memory name,
        string memory symbol,
        address creator
    ) ERC20(name, symbol) Ownable(creator) {
        _mint(creator, INITIAL_SUPPLY);
    }
}

contract TokenLaunchpad {
    struct TokenInfo {
        address tokenAddress;
        address creator;
        string name;
        string symbol;
        string description;
        string imageUrl;
        uint256 createdAt;
        uint256 totalRaised;
        uint256 targetRaise;
        bool isActive;
    }
    
    struct Trade {
        address trader;
        address token;
        bool isBuy;
        uint256 ethAmount;
        uint256 tokenAmount;
        uint256 timestamp;
    }
    
    // Events
    event TokenLaunched(
        address indexed tokenAddress,
        address indexed creator,
        string name,
        string symbol,
        uint256 targetRaise
    );
    
    event TokenTraded(
        address indexed token,
        address indexed trader,
        bool isBuy,
        uint256 ethAmount,
        uint256 tokenAmount,
        uint256 newPrice
    );
    
    event TokenGraduated(
        address indexed token,
        uint256 totalRaised
    );
    
    // State
    mapping(address => TokenInfo) public tokens;
    mapping(address => Trade[]) public tokenTrades;
    address[] public allTokens;
    
    uint256 public constant GRADUATION_THRESHOLD = 10 ether;
    uint256 public constant CREATOR_FEE_PERCENT = 5;
    uint256 public constant PLATFORM_FEE_PERCENT = 1;
    
    // Bonding curve parameters
    uint256 public constant CURVE_STEEPNESS = 1000;
    
    function launchToken(
        string memory name,
        string memory symbol,
        string memory description,
        string memory imageUrl
    ) external returns (address) {
        // Deploy new token
        MemeToken token = new MemeToken(name, symbol, msg.sender);
        address tokenAddress = address(token);
        
        // Store token info
        tokens[tokenAddress] = TokenInfo({
            tokenAddress: tokenAddress,
            creator: msg.sender,
            name: name,
            symbol: symbol,
            description: description,
            imageUrl: imageUrl,
            createdAt: block.timestamp,
            totalRaised: 0,
            targetRaise: GRADUATION_THRESHOLD,
            isActive: true
        });
        
        allTokens.push(tokenAddress);
        
        emit TokenLaunched(tokenAddress, msg.sender, name, symbol, GRADUATION_THRESHOLD);
        
        return tokenAddress;
    }
    
    function buyToken(address tokenAddress) external payable {
        TokenInfo storage token = tokens[tokenAddress];
        require(token.isActive, "Token not active");
        require(msg.value > 0, "Must send ETH");
        
        // Calculate token amount using bonding curve
        uint256 tokenAmount = calculateTokenAmount(token.totalRaised, msg.value, true);
        
        // Transfer tokens from creator
        MemeToken(tokenAddress).transferFrom(token.creator, msg.sender, tokenAmount);
        
        // Update state
        token.totalRaised += msg.value;
        
        // Record trade
        tokenTrades[tokenAddress].push(Trade({
            trader: msg.sender,
            token: tokenAddress,
            isBuy: true,
            ethAmount: msg.value,
            tokenAmount: tokenAmount,
            timestamp: block.timestamp
        }));
        
        // Distribute fees
        uint256 creatorFee = (msg.value * CREATOR_FEE_PERCENT) / 100;
        uint256 platformFee = (msg.value * PLATFORM_FEE_PERCENT) / 100;
        
        payable(token.creator).transfer(creatorFee);
        // Platform fee stays in contract
        
        emit TokenTraded(
            tokenAddress,
            msg.sender,
            true,
            msg.value,
            tokenAmount,
            getCurrentPrice(tokenAddress)
        );
        
        // Check for graduation
        if (token.totalRaised >= GRADUATION_THRESHOLD) {
            token.isActive = false;
            emit TokenGraduated(tokenAddress, token.totalRaised);
        }
    }
    
    function sellToken(address tokenAddress, uint256 tokenAmount) external {
        TokenInfo storage token = tokens[tokenAddress];
        require(token.isActive, "Token not active");
        require(tokenAmount > 0, "Must sell tokens");
        
        // Calculate ETH amount using bonding curve
        uint256 ethAmount = calculateTokenAmount(token.totalRaised, tokenAmount, false);
        require(address(this).balance >= ethAmount, "Insufficient liquidity");
        
        // Transfer tokens to creator
        MemeToken(tokenAddress).transferFrom(msg.sender, token.creator, tokenAmount);
        
        // Update state
        token.totalRaised -= ethAmount;
        
        // Record trade
        tokenTrades[tokenAddress].push(Trade({
            trader: msg.sender,
            token: tokenAddress,
            isBuy: false,
            ethAmount: ethAmount,
            tokenAmount: tokenAmount,
            timestamp: block.timestamp
        }));
        
        // Send ETH to seller (minus fees)
        uint256 creatorFee = (ethAmount * CREATOR_FEE_PERCENT) / 100;
        uint256 platformFee = (ethAmount * PLATFORM_FEE_PERCENT) / 100;
        uint256 sellerAmount = ethAmount - creatorFee - platformFee;
        
        payable(msg.sender).transfer(sellerAmount);
        payable(token.creator).transfer(creatorFee);
        
        emit TokenTraded(
            tokenAddress,
            msg.sender,
            false,
            ethAmount,
            tokenAmount,
            getCurrentPrice(tokenAddress)
        );
    }
    
    // Bonding curve calculation
    function calculateTokenAmount(
        uint256 currentRaised,
        uint256 ethAmount,
        bool isBuy
    ) public pure returns (uint256) {
        // Simple linear bonding curve
        // Price increases as more ETH is raised
        if (isBuy) {
            return (ethAmount * CURVE_STEEPNESS) / (currentRaised + 1);
        } else {
            return (ethAmount * CURVE_STEEPNESS) / (currentRaised);
        }
    }
    
    function getCurrentPrice(address tokenAddress) public view returns (uint256) {
        TokenInfo memory token = tokens[tokenAddress];
        if (token.totalRaised == 0) return CURVE_STEEPNESS;
        return token.totalRaised / CURVE_STEEPNESS;
    }
    
    function getActiveTokens() external view returns (address[] memory) {
        uint256 count = 0;
        for (uint i = 0; i < allTokens.length; i++) {
            if (tokens[allTokens[i]].isActive) count++;
        }
        
        address[] memory activeTokens = new address[](count);
        uint256 index = 0;
        for (uint i = 0; i < allTokens.length; i++) {
            if (tokens[allTokens[i]].isActive) {
                activeTokens[index++] = allTokens[i];
            }
        }
        
        return activeTokens;
    }
    
    function getTokenTrades(address tokenAddress) external view returns (Trade[] memory) {
        return tokenTrades[tokenAddress];
    }
}