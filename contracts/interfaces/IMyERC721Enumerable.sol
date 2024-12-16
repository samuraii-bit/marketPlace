// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IMyERC721Enumerable {
    function totalSupply() external view returns (uint256);
    function tokenByIndex(uint256 _index) external view returns (uint256);
}