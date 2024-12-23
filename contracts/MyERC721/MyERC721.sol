// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;
import "../interfaces/IMyERC721.sol";
import "../interfaces/IMyERC721TokenReceiver.sol";
import "../interfaces/IMyERC721Enumerable.sol";
import "../interfaces/IMyERC721Metadata.sol";
import "../interfaces/IMyERC165.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract MyERC721 is IMyERC165, IMyERC721, AccessControl{
    bytes32 public constant MARKETPLACE_ROLE = keccak256("MARKETPLACE_ROLE");
    error CallerNotMarketPlace(address caller);

    address public owner;
    string public name;
    string public symbol;
    uint256 public totalSupply;
    string public baseTokenURI;
    address public marketPlace;

    mapping (address => uint256) private balances;
    mapping (uint256 => address) private owners;
    mapping (uint256 => uint256) public tokensById;
    mapping (uint256 => address) private approved;
    mapping (address => mapping (address => bool)) public isApprovedForAll;

    constructor(string memory _name, string memory _symbol, string memory _baseTokenURI){
        owner = msg.sender;
        name = _name;
        symbol = _symbol;
        baseTokenURI = _baseTokenURI;
        totalSupply = 0;

        mint(owner); //нулевой токен нужно сразу заминтить владельцу контракта. (нужно для реализации логики)
    }

    function setMarketPlace(address _marketPlace) external{
        require(msg.sender == owner, "Only owner can set MarketPlace");

        marketPlace = _marketPlace;
        _grantRole(MARKETPLACE_ROLE, marketPlace);
        
        emit SetMarketPlace(msg.sender, _marketPlace);
    }

    function mint(address _to) public {
        require(
            msg.sender == _to ||
            msg.sender == owner ||
            hasRole(MARKETPLACE_ROLE, msg.sender),  
            "U cant mint tokens for other users"
        );
        
        tokensById[totalSupply] = uint256(bytes32(keccak256(abi.encodePacked(_to, totalSupply)))); //
        owners[totalSupply] = _to;
        totalSupply++;
        balances[_to]++;

        emit Transfer(address(0), _to, totalSupply - 1);
    }

    function burn(address _from, uint256 _tokenId) public {
        require(
            msg.sender == _from ||
            msg.sender == owner,
            "U cant burn tokens of other users"
            );
        
        require(tokensById[_tokenId] != 0, "There are no tokens with entered Id");

        totalSupply--;
        balances[_from]--;
        delete owners[_tokenId];
        delete tokensById[_tokenId];
        
        emit Transfer(_from, address(0), _tokenId);
    }

    function tokenByIndex(uint256 _index) public view returns (uint256){
        require(_index < totalSupply, "Invalid tokenId was entered");
        return tokensById[_index];
    } 

    function balanceOf(address _owner) public view returns (uint256) {
        require(_owner != address(0), "Invalid owner address");
        return balances[_owner];
    }
    
    function ownerOf(uint256 _tokenId) public view returns (address) {
        require(owners[_tokenId] != address(0), "Invalid token id was entered");
        return owners[_tokenId];
    }

    function getApproved(uint256 _tokenId) public view returns (address) {
        require(approved[_tokenId] != address(0), "Invalid token id was entered");
        return approved[_tokenId];
    }

    function tokenURI(uint256 _tokenId) public view returns (string memory) {
        require(tokensById[_tokenId] != 0, "There are no tokens with entered Id");
        return string.concat(
            baseTokenURI,
            Strings.toString(_tokenId)
        );
    }

    function approve(address _approved, uint256 _tokenId) public {
        address _tokenOwner = owners[_tokenId];
        require(
            msg.sender == _tokenOwner ||
            isApprovedForAll[_tokenOwner][msg.sender] == true, 
            "Only owner of token or operator can approve the transfer"
            );
        approved[_tokenId] = _approved;

        emit Approval(msg.sender, _approved, _tokenId);
    }

    function setApprovalForAll(address _operator, bool _approved) public {
        isApprovedForAll[msg.sender][_operator] = _approved;

        emit ApprovalForAll(msg.sender,  _operator, _approved);
    }

    modifier ownerOperatorApprovedUser(address _from, address _to, uint256 _tokenId) {
        address _tokenOwner = owners[_tokenId];
        require(
            msg.sender == approved[_tokenId] ||
            msg.sender == _from ||
            isApprovedForAll[_tokenOwner][msg.sender] ||
            hasRole(MARKETPLACE_ROLE, msg.sender),
            "Only owner of token, operators and approved user can transfer tokens"
        );
        _;
    }

    function checkOnERC721Received(address _from, address _to, uint256 _tokenId, bytes memory data) internal returns (bool) {
        if (_to.code.length > 0) {
            try IMyERC721TokenReceiver(_to).onERC721Received(msg.sender, _from, _tokenId, data) returns (bytes4 res) {
                require(
                    res == bytes4(keccak256("onERC721Received(address,address,uint256,bytes)")), 
                    "Wrong defenition of onERC721Received() in contract-receiver"
                    );
                return true;
            } catch {
                revert("Contract-receiver cant be an owner of NFT ERC721");
            } 
        }
        else {
            return true;
        }
    }

    function transferFrom(address _from, address _to, uint256 _tokenId) public ownerOperatorApprovedUser(_from, _to, _tokenId) {     
        transfer(_from, _to, _tokenId);
    }

    function safeTransferFrom(address _from, address _to, uint256 _tokenId) public ownerOperatorApprovedUser(_from, _to, _tokenId) {
        require(_from == owners[_tokenId], "U can transfer tokens only from owner");
        require(_to != address(0), "Invalid receiver address");

        transfer(_from, _to, _tokenId);

        require(checkOnERC721Received(_from, _to, _tokenId, ""));
    }
    
    function safeTransferFrom(address _from, address _to, uint256 _tokenId, bytes memory data) public ownerOperatorApprovedUser(_from, _to, _tokenId) {
        require(_from == owners[_tokenId], "U can transfer tokens only from owner");
        require(_to != address(0), "Invalid receiver address");

        transfer(_from, _to, _tokenId);

        require(checkOnERC721Received(_from, _to, _tokenId, data));
    }
    
    function transfer(address _from, address _to, uint256 _tokenId) internal {
        balances[_from]--;
        balances[_to]++;
        owners[_tokenId] = _to;

        emit Transfer(_from, _to, _tokenId);
    }

    function supportsInterface(bytes4 interfaceID) public view virtual override(IMyERC165, AccessControl) returns (bool) {
        return (interfaceID == type(IMyERC721).interfaceId ||
                interfaceID == type(IMyERC165).interfaceId ||
                interfaceID == type(IMyERC721Enumerable).interfaceId ||
                interfaceID == type(IMyERC721Metadata).interfaceId);
    }
}