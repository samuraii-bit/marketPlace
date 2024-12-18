// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract ContractNonReceiver {
    string public name;
    constructor(string memory _name){
        name = _name;
    }
}