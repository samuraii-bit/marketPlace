// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IMarketPlace {
    
    function onERC721Received(address _operator, address _from, uint256 _tokenId, bytes memory _data) external returns (bytes4);

    event CreateItem(address _to);
    event ListItem(address _seller, uint256 _tokenId, uint256 _price);
    event BuyItem();
    event BuyItem(address _buyer, uint256 _tokenId, uint256 _price, address _seller);
    event CancelListing(address _from, uint256 _tokenId);
    event ListItemOnAuction(address _from, uint256 _tokenId, uint256 _startPrice);
    event MakeBid(address _from, uint256 _tokenId);
    event CancelAuction(address _from, uint256 _tokenId);
    event FinishAuction(address _from, uint256 _tokenId, address _winner);
    
}