// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;
import "./interfaces/IMarketPlace.sol";
import "./interfaces/IMyERC721.sol";
import "./interfaces/IMyERC721TokenReceiver.sol";

contract MarketPlace is IMarketPlace, IMyERC721TokenReceiver {
    address public owner;
    string public name;
    IMyERC721 public nftContract;
    uint256 constant public AUCTION_DURATION = 3 days;
    
    mapping (uint256 => listing) public listings;
    mapping (uint256 => auction) public auctions;

    struct auction {
        address seller;
        uint256 startPrice;
        uint256 bidsCount;
        uint256 highestBid;
        address candidate;
        uint256 startTime;
    }

    struct listing {
        address seller;
        uint256 price;
    }
    
    constructor(string memory _name, address _nftContract){
        owner = msg.sender;
        name = _name;
        nftContract = IMyERC721(_nftContract);
    }
    
    function createItem(address _to) public {
        nftContract.mint(_to);
        emit CreateItem(_to);
    }

    modifier ownerOnly(uint256 _tokenId){
        require(
            nftContract.ownerOf(_tokenId) == msg.sender ||
            listings[_tokenId].seller == msg.sender || 
            auctions[_tokenId].seller == msg.sender,
            "Only owner can list or cancel listening NFT"
        );
        _;
    }

    function listItem(uint256 _tokenId, uint256 _price) external ownerOnly(_tokenId) {
        listings[_tokenId].price = _price;
        listings[_tokenId].seller = msg.sender;
        nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);

        emit ListItem(msg.sender, _tokenId, _price);
    }

    function buyItem(uint256 _tokenId) external payable { // дописать проверку на approval
        require(msg.value == listings[_tokenId].price, "Wrong sum");
        nftContract.safeTransferFrom(address(this), msg.sender, _tokenId);
        payable(listings[_tokenId].seller).transfer(msg.value);

        emit BuyItem(msg.sender, _tokenId, msg.value, listings[_tokenId].seller);
        delete listings[_tokenId];
    }

    function cancel(uint256 _tokenId) external ownerOnly(_tokenId) {
        nftContract.safeTransferFrom(address(this), listings[_tokenId].seller, _tokenId);
        
        delete listings[_tokenId];
        emit CancelListing(msg.sender, _tokenId);
    }

    function listItemOnAuction(uint256 _tokenId, uint256 _startPrice) public ownerOnly(_tokenId) {
        auctions[_tokenId].startTime = block.timestamp;
        auctions[_tokenId].bidsCount = 0;
        auctions[_tokenId].seller = msg.sender;
        auctions[_tokenId].startPrice = _startPrice;
        nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);

        emit ListItemOnAuction(msg.sender, _tokenId, _startPrice);
    }

    modifier auctionExists(uint256 _tokenId){
        require(auctions[_tokenId].seller != address(0), "Auction doesn't exist");
        _;
    }

    function makeBid(uint256 _tokenId) external payable auctionExists(_tokenId) returns (bool success){
        require(msg.value > auctions[_tokenId].startPrice, "The bid is less than start price of this NFT");
        require(msg.value > auctions[_tokenId].highestBid, "The bid is less than highest bid offered for this NFT");
        
        if (block.timestamp >= auctions[_tokenId].startTime + AUCTION_DURATION && auctions[_tokenId].bidsCount <= 2) {
            if (auctions[_tokenId].bidsCount == 0){ 
                nftContract.safeTransferFrom(address(this), auctions[_tokenId].seller, _tokenId);
            }
            else {
                nftContract.safeTransferFrom(address(this), auctions[_tokenId].seller, _tokenId);
                payable(auctions[_tokenId].candidate).transfer(auctions[_tokenId].highestBid);
            }
            emit FinishAuction(msg.sender, _tokenId, address(0));
            delete auctions[_tokenId];
            return false;
        }

        if (auctions[_tokenId].bidsCount >= 1) {
            payable(auctions[_tokenId].candidate).transfer(auctions[_tokenId].highestBid);
        }

        auctions[_tokenId].highestBid = msg.value;
        auctions[_tokenId].candidate = msg.sender;
        auctions[_tokenId].bidsCount++;

        emit MakeBid(msg.sender, _tokenId, msg.value);
        return true;
    }

    function finishAuction(uint256 _tokenId) public payable auctionExists(_tokenId) ownerOnly(_tokenId) {
        require(block.timestamp >= (auctions[_tokenId].startTime + AUCTION_DURATION), "U cannot finish the auction less than three days after it starts");

        payable(auctions[_tokenId].seller).transfer(auctions[_tokenId].highestBid);
        nftContract.safeTransferFrom(address(this), auctions[_tokenId].candidate, _tokenId);

        emit FinishAuction(msg.sender, _tokenId, auctions[_tokenId].candidate);

        delete auctions[_tokenId];
    }
    
    function cancelAuction(uint256 _tokenId) external payable auctionExists(_tokenId) ownerOnly(_tokenId) {
        payable(auctions[_tokenId].candidate).transfer(auctions[_tokenId].highestBid);
        nftContract.safeTransferFrom(address(this), auctions[_tokenId].seller, _tokenId);

        delete auctions[_tokenId];
        
        emit CancelAuction(msg.sender, _tokenId);
    } 

    function onERC721Received(address _operator, address _from, uint256 _tokenId, bytes memory _data) public returns (bytes4){
        return bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"));
    }
}