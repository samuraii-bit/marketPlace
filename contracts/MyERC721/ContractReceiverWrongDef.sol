// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;
import "../interfaces/IMyERC721TokenReceiver.sol";

contract ContractReceiverWrongDef is IMyERC721TokenReceiver{
    string public name;
    constructor(string memory _name){
        name = _name;
    }

    function onERC721Received(address _operator, address _from, uint256 _tokenId, bytes memory _data) external returns (bytes4){
        return bytes4(keccak256("cook"));
    }
}