// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

contract ChatApp {

    constructor() {

    }

    mapping (address => string) public userId;
    mapping (address => bool) public isUserRegistered;
    mapping (address => int256) public karma;
    mapping (uint256 => address) public msgIdToUser;

    event UserRegistered(address indexed user, string userId);
    event MessageSent(address indexed user, string userId, string message, uint256 msgId);
    event KarmaChanged(address indexed user, string userId, int256 karma);

    uint256 public msgId;

    function registerUser(string memory _userId) public {
        require(!isUserRegistered[msg.sender], "User already registered");
        userId[msg.sender] = _userId;
        isUserRegistered[msg.sender] = true;
        emit UserRegistered(msg.sender, _userId);
    }

    function sendMessage(string memory _message) public {
        require(isUserRegistered[msg.sender], "User not registered");
        msgIdToUser[msgId] = msg.sender;
        emit MessageSent(msg.sender, userId[msg.sender], _message, msgId);
        msgId++;
    }

    function giveKarma(uint256 _msgId) public {
        require(isUserRegistered[msg.sender], "User not registered");
        require(_msgId < msgId, "Invalid msgId");
        address user = msgIdToUser[_msgId];
        require(user != address(0), "Message not found");
        require(user != msg.sender, "Cannot karma your own message");

        karma[user] += 1;
        emit KarmaChanged(user, userId[user], karma[user]);
    }

    function takeKarma(uint256 _msgId) public {
        require(isUserRegistered[msg.sender], "User not registered");
        require(_msgId < msgId, "Invalid msgId");
        address user = msgIdToUser[_msgId];
        require(user != address(0), "Message not found");
        require(user != msg.sender, "Cannot karma your own message");

        karma[user] -= 1;
        emit KarmaChanged(user, userId[user], karma[user]);
    }




}
