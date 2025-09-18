// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

interface IWETH {
    function deposit() external payable;
    function transfer(address to, uint value) external returns (bool);
    function withdraw(uint) external;
    function approve(address spender, uint value) external returns (bool);
    function balanceOf(address owner) external view returns (uint);
}