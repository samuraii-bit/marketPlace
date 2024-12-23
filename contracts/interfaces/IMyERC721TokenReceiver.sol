// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IMyERC721TokenReceiver{
    function onERC721Received(address _operator, address _from, uint256 _tokenId, bytes memory _data) external returns (bytes4);
}