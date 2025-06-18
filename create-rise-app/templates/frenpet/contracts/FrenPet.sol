// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./interfaces/IVRF.sol";

contract FrenPet is IVRFConsumer {
    IVRFCoordinator constant VRF = IVRFCoordinator(0x9d57aB4517ba97349551C876a01a7580B1338909);
    
    struct Pet {
        string name;
        uint256 level;
        uint256 experience;
        uint256 happiness;
        uint256 hunger;
        uint256 lastFed;
        uint256 lastPlayed;
        uint256 birthTime;
        bool isAlive;
        uint256 winStreak;
    }
    
    struct Battle {
        address challenger;
        address opponent;
        uint256 requestId;
        bool pending;
    }
    
    mapping(address => Pet) public pets;
    mapping(address => bool) public hasPet;
    mapping(uint256 => Battle) public battles;
    mapping(uint256 => address) public vrfRequestToOwner;
    
    uint256 public constant HAPPINESS_DECAY_RATE = 1 hours;
    uint256 public constant HUNGER_INCREASE_RATE = 2 hours;
    uint256 public constant FEED_COST = 0.001 ether;
    uint256 public constant PLAY_COST = 0.0005 ether;
    uint256 public constant BATTLE_COST = 0.002 ether;
    
    event PetCreated(address indexed owner, string name);
    event PetFed(address indexed owner, uint256 newHunger);
    event PetPlayed(address indexed owner, uint256 newHappiness);
    event BattleInitiated(address indexed challenger, address indexed opponent, uint256 requestId);
    event BattleResult(address indexed winner, address indexed loser, uint256 requestId);
    event PetLevelUp(address indexed owner, uint256 newLevel);
    
    modifier onlyPetOwner() {
        require(hasPet[msg.sender], "You don't have a pet");
        require(pets[msg.sender].isAlive, "Your pet is no longer with us");
        _;
    }
    
    function createPet(string memory _name) external {
        require(!hasPet[msg.sender], "You already have a pet");
        require(bytes(_name).length > 0, "Name cannot be empty");
        
        pets[msg.sender] = Pet({
            name: _name,
            level: 1,
            experience: 0,
            happiness: 100,
            hunger: 0,
            lastFed: block.timestamp,
            lastPlayed: block.timestamp,
            birthTime: block.timestamp,
            isAlive: true,
            winStreak: 0
        });
        
        hasPet[msg.sender] = true;
        emit PetCreated(msg.sender, _name);
    }
    
    function feedPet() external payable onlyPetOwner {
        require(msg.value >= FEED_COST, "Insufficient payment");
        
        Pet storage pet = pets[msg.sender];
        updatePetStats(msg.sender);
        
        pet.hunger = 0;
        pet.lastFed = block.timestamp;
        pet.experience += 10;
        
        checkLevelUp(msg.sender);
        
        emit PetFed(msg.sender, pet.hunger);
    }
    
    function playWithPet() external payable onlyPetOwner {
        require(msg.value >= PLAY_COST, "Insufficient payment");
        
        Pet storage pet = pets[msg.sender];
        updatePetStats(msg.sender);
        
        pet.happiness = 100;
        pet.lastPlayed = block.timestamp;
        pet.experience += 5;
        
        checkLevelUp(msg.sender);
        
        emit PetPlayed(msg.sender, pet.happiness);
    }
    
    function initiateBattle(address opponent) external payable onlyPetOwner {
        require(msg.value >= BATTLE_COST, "Insufficient payment");
        require(hasPet[opponent], "Opponent doesn't have a pet");
        require(pets[opponent].isAlive, "Opponent's pet is not alive");
        require(msg.sender != opponent, "Cannot battle yourself");
        
        updatePetStats(msg.sender);
        updatePetStats(opponent);
        
        // Request random number for battle outcome
        uint256 requestId = VRF.requestRandomNumbers(
            1,      // number of random numbers
            uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, opponent)))  // seed
        );
        
        battles[requestId] = Battle({
            challenger: msg.sender,
            opponent: opponent,
            requestId: requestId,
            pending: true
        });
        
        emit BattleInitiated(msg.sender, opponent, requestId);
    }
    
    function rawFulfillRandomNumbers(
        uint256 requestId,
        uint256[] calldata randomNumbers
    ) external override {
        require(msg.sender == address(VRF), "Only VRF can fulfill");
        
        Battle storage battle = battles[requestId];
        require(battle.pending, "Battle already resolved");
        
        battle.pending = false;
        
        Pet storage challengerPet = pets[battle.challenger];
        Pet storage opponentPet = pets[battle.opponent];
        
        // Calculate battle outcome based on stats and randomness
        uint256 challengerPower = calculateBattlePower(challengerPet);
        uint256 opponentPower = calculateBattlePower(opponentPet);
        
        uint256 totalPower = challengerPower + opponentPower;
        uint256 randomOutcome = randomNumbers[0] % totalPower;
        
        address winner;
        address loser;
        
        if (randomOutcome < challengerPower) {
            winner = battle.challenger;
            loser = battle.opponent;
            challengerPet.winStreak++;
            opponentPet.winStreak = 0;
        } else {
            winner = battle.opponent;
            loser = battle.challenger;
            opponentPet.winStreak++;
            challengerPet.winStreak = 0;
        }
        
        // Award experience
        pets[winner].experience += 50;
        pets[loser].experience += 20;
        
        checkLevelUp(winner);
        checkLevelUp(loser);
        
        emit BattleResult(winner, loser, requestId);
    }
    
    function updatePetStats(address owner) internal {
        Pet storage pet = pets[owner];
        if (!pet.isAlive) return;
        
        uint256 timeSinceLastFed = block.timestamp - pet.lastFed;
        uint256 timeSinceLastPlayed = block.timestamp - pet.lastPlayed;
        
        // Update hunger
        uint256 hungerIncrease = (timeSinceLastFed / HUNGER_INCREASE_RATE) * 10;
        pet.hunger = pet.hunger + hungerIncrease > 100 ? 100 : pet.hunger + hungerIncrease;
        
        // Update happiness
        uint256 happinessDecrease = (timeSinceLastPlayed / HAPPINESS_DECAY_RATE) * 10;
        pet.happiness = pet.happiness < happinessDecrease ? 0 : pet.happiness - happinessDecrease;
        
        // Check if pet dies
        if (pet.hunger >= 100 || pet.happiness == 0) {
            pet.isAlive = false;
        }
    }
    
    function calculateBattlePower(Pet memory pet) internal pure returns (uint256) {
        return pet.level * 100 + pet.happiness + (100 - pet.hunger) + pet.winStreak * 50;
    }
    
    function checkLevelUp(address owner) internal {
        Pet storage pet = pets[owner];
        uint256 requiredExp = pet.level * 100;
        
        if (pet.experience >= requiredExp) {
            pet.level++;
            pet.experience -= requiredExp;
            emit PetLevelUp(owner, pet.level);
        }
    }
    
    function getPetStats(address owner) external view returns (
        string memory name,
        uint256 level,
        uint256 experience,
        uint256 happiness,
        uint256 hunger,
        bool isAlive,
        uint256 winStreak
    ) {
        Pet memory pet = pets[owner];
        
        // Calculate current stats without updating storage
        uint256 currentHunger = pet.hunger;
        uint256 currentHappiness = pet.happiness;
        
        if (pet.isAlive) {
            uint256 timeSinceLastFed = block.timestamp - pet.lastFed;
            uint256 timeSinceLastPlayed = block.timestamp - pet.lastPlayed;
            
            uint256 hungerIncrease = (timeSinceLastFed / HUNGER_INCREASE_RATE) * 10;
            currentHunger = pet.hunger + hungerIncrease > 100 ? 100 : pet.hunger + hungerIncrease;
            
            uint256 happinessDecrease = (timeSinceLastPlayed / HAPPINESS_DECAY_RATE) * 10;
            currentHappiness = pet.happiness < happinessDecrease ? 0 : pet.happiness - happinessDecrease;
        }
        
        return (
            pet.name,
            pet.level,
            pet.experience,
            currentHappiness,
            currentHunger,
            pet.isAlive && currentHunger < 100 && currentHappiness > 0,
            pet.winStreak
        );
    }
}