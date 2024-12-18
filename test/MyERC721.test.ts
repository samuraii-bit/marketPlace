import {loadFixture, ethers, expect} from "./setup";
import {name, symbol, baseTokenURI} from "../tokenInit";

describe("Testing MyERC721", function() {

    async function deploy() {
        const users = await ethers.getSigners();
    
        const FactoryMyERC721 = await ethers.getContractFactory(name);
        const MyERC721 = await FactoryMyERC721.deploy(name, symbol, baseTokenURI);

        const FactoryContractReceiver = await ethers.getContractFactory("ContractReceiver");
        const ContractReceiver = await FactoryContractReceiver.deploy("ContractReceiver");

        const FactoryContractNonReceiver = await ethers.getContractFactory("ContractNonReceiver");
        const ContractNonReceiver = await FactoryContractNonReceiver.deploy("ContractNonReceiver");

        const FactoryContractReceiverWrongDef = await ethers.getContractFactory("ContractReceiverWrongDef");
        const ContractReceiverWrongDef = await FactoryContractReceiverWrongDef.deploy("ContractReceiverWrongDef");

        const FactoryMarketPlace = await ethers.getContractFactory("MarketPlace");
        const MarketPlace = await FactoryMarketPlace.deploy("MarketPlace", MyERC721.target);

        return {users, MyERC721, ContractReceiver, ContractNonReceiver, ContractReceiverWrongDef, MarketPlace};
    }

    it("Deployment test", async function(){
        const {MyERC721} = await loadFixture(deploy);
        expect(MyERC721.target).to.be.properAddress;
    });

    it("mint test: mint 1 token for users[1] from owner", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        const tx = await MyERC721.connect(users[0]).mint(users[1].address);

        await expect(tx).to.changeTokenBalance(MyERC721, users[1].address, 1);
        await expect(tx).to.emit(MyERC721, "Transfer").withArgs(ethers.ZeroAddress, users[1].address, 1);
    });

    it("mint test: mint 1 token for users[1] from users[1]", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        const tx = await MyERC721.connect(users[1]).mint(users[1].address);

        await expect(tx).to.changeTokenBalance(MyERC721, users[1].address, 1);
        await expect(tx).to.emit(MyERC721, "Transfer").withArgs(ethers.ZeroAddress, users[1].address, 1);
    });   

    it("mint test: trying to mint 1 token for users[1] from users[2]", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        const tx = await MyERC721.connect(users[2]);

        await expect(tx.mint(users[1].address)).to.be.revertedWith("U cant mint tokens for other users");
    });
    
    it("burn test: mint 1 token for users[1] from owner and then burn it as owner", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        const tx1 = await MyERC721.connect(users[0]).mint(users[1].address);
        await expect(tx1).to.changeTokenBalance(MyERC721, users[1].address, 1);
        await expect(tx1).to.emit(MyERC721, "Transfer").withArgs(ethers.ZeroAddress, users[1].address, 1);

        const tx2 = await MyERC721.connect(users[0]).burn(users[1].address, 1);
        await expect(tx2).to.changeTokenBalance(MyERC721, users[1].address, -1);
        await expect(tx2).to.emit(MyERC721, "Transfer").withArgs(users[1].address, ethers.ZeroAddress, 1);
    });

    it("burn test: mint 1 token for users[1] from users[1] and then burn it as users[1]", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        const tx1 = await MyERC721.connect(users[1]).mint(users[1].address);
        await expect(tx1).to.changeTokenBalance(MyERC721, users[1].address, 1);
        await expect(tx1).to.emit(MyERC721, "Transfer").withArgs(ethers.ZeroAddress, users[1].address, 1);

        const tx2 = await MyERC721.connect(users[1]).burn(users[1].address, 1);
        await expect(tx2).to.changeTokenBalance(MyERC721, users[1].address, -1);
        await expect(tx2).to.emit(MyERC721, "Transfer").withArgs(users[1].address, ethers.ZeroAddress, 1);
    });

    it("burn test: trying to burn not existing token", async function(){
        const {MyERC721, users} = await loadFixture(deploy);

        const tx2 = await MyERC721.connect(users[0]);
        await expect(tx2.burn(users[1].address, 100)).to.be.revertedWith("There are no tokens with entered Id");
    });

    it("burn test: trying to burn token as non-owner", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        const tx1 = await MyERC721.connect(users[0]).mint(users[1].address);
        await expect(tx1).to.changeTokenBalance(MyERC721, users[1].address, 1);
        await expect(tx1).to.emit(MyERC721, "Transfer").withArgs(ethers.ZeroAddress, users[1].address, 1);

        const tx2 = await MyERC721.connect(users[2]);
        await expect(tx2.burn(users[1].address, 0)).to.be.revertedWith("U cant burn tokens of other users");
    });

    it("tokenByIndex test: check token with id = 1", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[0]).mint(users[1].address);

        const tx1 = await MyERC721.tokenByIndex(1);
        const tx2 = await MyERC721.tokensById(1);
        expect(tx1).to.be.equal(tx2);
    });

    it("tokenByIndex test: trying to check token with id > totalSupply", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[0]).mint(users[1].address);
        const tx = await MyERC721.connect(users[0]);

        await expect(tx.tokenByIndex(2)).to.be.revertedWith("Invalid tokenId was entered");
    });

    it("balanceOf test: mint 2 tokens for users[1] and check balance of users[1]", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[0]).mint(users[1].address);
        await MyERC721.connect(users[0]).mint(users[1].address);
        const tx = await MyERC721.connect(users[0]).balanceOf(users[1].address);

        expect(tx).to.be.equal(2);
    });

    it("balanceOf test: trying to call function with 0-address as argument", async function(){
        const {MyERC721} = await loadFixture(deploy);
        await expect(MyERC721.balanceOf(ethers.ZeroAddress)).to.be.revertedWith("Invalid owner address");
    });

    it("ownerOf test: mint 1st token for users[1], mint 2nd token for users[2] and check owner of 2nd token", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[0]).mint(users[1].address);
        await MyERC721.connect(users[0]).mint(users[2].address);
        const tx = await MyERC721.connect(users[0]).ownerOf(2);

        expect(tx).to.be.equal(users[2].address);
    });

    it("ownerOf test: trying to call function with not id of not existing token", async function(){
        const {MyERC721} = await loadFixture(deploy);
        await expect(MyERC721.ownerOf(1)).to.be.revertedWith("Invalid token id was entered");
    });

    it("tokenURI test: trying to get URI of not existing token", async function(){
        const {MyERC721, users} = await loadFixture(deploy);

        const tx2 = await MyERC721.connect(users[0]);
        await expect(tx2.tokenURI(100)).to.be.revertedWith("There are no tokens with entered Id");
    });

    it("tokenURI test", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[0]).mint(users[1].address);
        const tx = await MyERC721.tokenURI(1);

        expect(tx).to.be.equal(baseTokenURI + "1");
    });

    it("approve test: mint 1 token for users[1] and then approve it for users[2] as owner", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        const tx1= await MyERC721.connect(users[1]).approve(users[2].address, 1);
        const tx2 = await MyERC721.getApproved(1)
        
        await expect(tx1).to.emit(MyERC721, "Approval");
        expect(tx2).to.be.equal(users[2].address);
    });

    it("approve test: trying to approve as non-owner and non-operator", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        const tx = await MyERC721.connect(users[2]);
        
        await expect(tx.approve(users[2].address, 1)).to.be.revertedWith("Only owner of token or operator can approve the transfer");
    });

    it("approve test: trying to approve as operator", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        await MyERC721.connect(users[1]).setApprovalForAll(users[2], true);
        const tx1 = await MyERC721.connect(users[2]).approve(users[3], 1);
        const tx2 = await MyERC721.getApproved(1);
        
        await expect(tx1).to.emit(MyERC721, "Approval");
        expect(tx2).to.be.equal(users[3].address);
    });

    it("getApproved test: mint 1st token for users[1], mint 2nd token for users[2] and check owner of 2nd token", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        const tx1= await MyERC721.connect(users[1]).approve(users[2].address, 1);
        const tx2 = await MyERC721.getApproved(1)
        
        await expect(tx1).to.emit(MyERC721, "Approval");
        expect(tx2).to.be.equal(users[2].address);
    });

    it("getApproved test: trying to call function with id of not existing token", async function(){
        const {MyERC721} = await loadFixture(deploy);
        await expect(MyERC721.getApproved(1)).to.be.revertedWith("Invalid token id was entered");
    });

    it("setApprovalForAll test: mint 1 token for users[1] and then make users[2] operator as owner", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        const tx1= await MyERC721.connect(users[1]).setApprovalForAll(users[2].address, true);
        const tx2 = await MyERC721.isApprovedForAll(users[1].address, users[2].address);
        
        await expect(tx1).to.emit(MyERC721, "ApprovalForAll");
        expect(tx2).to.be.equal(true);
    });

    it("setApprovalForAll test: mint 1 token for users[1] and then make users[2] operator as owner, then take away operator rights", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        const tx1= await MyERC721.connect(users[1]).setApprovalForAll(users[2].address, true);
        const tx2 = await MyERC721.isApprovedForAll(users[1].address, users[2].address);
        const tx3= await MyERC721.connect(users[1]).setApprovalForAll(users[2].address, true);
        const tx4 = await MyERC721.isApprovedForAll(users[1].address, users[2].address);
        
        await expect(tx1).to.emit(MyERC721, "ApprovalForAll");
        expect(tx2).to.be.equal(true);
        await expect(tx3).to.emit(MyERC721, "ApprovalForAll");
        expect(tx4).to.be.equal(true);
    });

    it("transferFrom test: transfer token 1 from users[1] to users[2] as approved user users[2]", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        await MyERC721.connect(users[1]).approve(users[2].address, 1);
        const tx = await MyERC721.connect(users[2]).transferFrom(users[1], users[2], 1);

        await expect(tx).to.changeTokenBalance(MyERC721, users[1].address, -1);
        await expect(tx).to.changeTokenBalance(MyERC721, users[2].address, 1);
        await expect(await MyERC721.ownerOf(1)).to.be.equal(users[2].address);
        await expect(tx).to.emit(MyERC721, "Transfer");
    });

    it("transferFrom test: transfer token 1 from users[1] to users[2] as operator", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        await MyERC721.connect(users[1]).setApprovalForAll(users[2].address, true);
        const tx = await MyERC721.connect(users[2]).transferFrom(users[1], users[3], 1);

        await expect(tx).to.changeTokenBalance(MyERC721, users[1].address, -1);
        await expect(tx).to.changeTokenBalance(MyERC721, users[3].address, 1);
        await expect(await MyERC721.ownerOf(1)).to.be.equal(users[3].address);
        await expect(tx).to.emit(MyERC721, "Transfer");
    });

    it("transferFrom test: transfer token 1 from users[1] to users[2] as owner", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        const tx = await MyERC721.connect(users[1]).transferFrom(users[1], users[4], 1);

        await expect(tx).to.changeTokenBalance(MyERC721, users[1].address, -1);
        await expect(tx).to.changeTokenBalance(MyERC721, users[4].address, 1);
        await expect(await MyERC721.ownerOf(1)).to.be.equal(users[4].address);
        await expect(tx).to.emit(MyERC721, "Transfer");
    });

    it("transferFrom test: trying to call function as non-owner, non-approved user and non-operator", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        await MyERC721.connect(users[1]).approve(users[2].address, 1);
        const tx = await MyERC721.connect(users[3]);

        await expect(tx.transferFrom(users[1].address, users[2].address, 1)).to.be.revertedWith("Only owner of token, operators and approved user can transfer tokens");
    });

    it("safeTransferFrom{3} test: trying to transfer tokens from non-owner", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        await MyERC721.connect(users[1]).approve(users[2].address, 1);
        const tx = await MyERC721.connect(users[2]);

        await expect(tx["safeTransferFrom(address,address,uint256)"](users[3].address, users[2].address, 1)).to.be.revertedWith("U can transfer tokens only from owner");
    });

    it("safeTransferFrom{3} test: trying to call function as non-owner, non-approved user and non-operator", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        await MyERC721.connect(users[1]).approve(users[2].address, 1);
        const tx = await MyERC721.connect(users[3]);

        await expect(tx["safeTransferFrom(address,address,uint256)"](users[1].address, users[2].address, 1)).to.be.revertedWith("Only owner of token, operators and approved user can transfer tokens");
    });

    it("safeTransferFrom{3} test: trying to call function with invalid receiver address (0-address)", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        await MyERC721.connect(users[1]).approve(users[2].address, 1);
        const tx = await MyERC721.connect(users[2]);

        await expect(tx["safeTransferFrom(address,address,uint256)"](users[1].address, ethers.ZeroAddress, 1)).to.be.revertedWith("Invalid receiver address");
    });

    it("safeTransferFrom{3} test: transfer from users[1] to users[2] as owner", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        const tx = await MyERC721.connect(users[1])["safeTransferFrom(address,address,uint256)"](users[1].address, users[2].address, 1);

        await expect(tx).to.be.changeTokenBalance(MyERC721, users[1], -1);
        await expect(tx).to.be.changeTokenBalance(MyERC721, users[2], 1);
        await expect(tx).to.emit(MyERC721, "Transfer");
    });

    it("safeTransferFrom{3} test: transfer from users[1] to users[3] as approved user users[2]", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        await MyERC721.connect(users[1]).approve(users[2].address, 1);
        const tx = await MyERC721.connect(users[2])["safeTransferFrom(address,address,uint256)"](users[1].address, users[3].address, 1);

        await expect(tx).to.be.changeTokenBalance(MyERC721, users[1], -1);
        await expect(tx).to.be.changeTokenBalance(MyERC721, users[3], 1);
        await expect(tx).to.emit(MyERC721, "Transfer");
    });

    it("safeTransferFrom{3} test: transfer from users[1] to users[4] as operator users[2]", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        await MyERC721.connect(users[1]).setApprovalForAll(users[2].address, true);
        const tx = await MyERC721.connect(users[2])["safeTransferFrom(address,address,uint256)"](users[1].address, users[4].address, 1);

        await expect(tx).to.be.changeTokenBalance(MyERC721, users[1], -1);
        await expect(tx).to.be.changeTokenBalance(MyERC721, users[4], 1);
        await expect(tx).to.emit(MyERC721, "Transfer");
    });

    it("safeTransferFrom{3} test: transfer from users[1] to ContractReceiver as owner", async function(){
        const {MyERC721, users, ContractReceiver} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        const tx = await MyERC721.connect(users[1])["safeTransferFrom(address,address,uint256)"](users[1].address, ContractReceiver.target, 1);

        await expect(tx).to.be.changeTokenBalance(MyERC721, users[1], -1);
        await expect(tx).to.be.changeTokenBalance(MyERC721, ContractReceiver.target, 1);
        await expect(tx).to.emit(MyERC721, "Transfer");
    });

    it("safeTransferFrom{3} test: trying to transfer from users[1] to ContractNonReceiver as owner", async function(){
        const {MyERC721, users, ContractNonReceiver} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        const tx = await MyERC721.connect(users[1]);

        await expect(tx["safeTransferFrom(address,address,uint256)"](users[1].address, ContractNonReceiver.target, 1)).to.be.revertedWith("Contract-receiver cant be an owner of NFT ERC721");
    });

    it("safeTransferFrom{4} test: transfer from users[1] to users[2] as owner", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        const tx = await MyERC721.connect(users[1])["safeTransferFrom(address,address,uint256,bytes)"](users[1].address, users[2].address, 1, ethers.toUtf8Bytes("hello"));

        await expect(tx).to.be.changeTokenBalance(MyERC721, users[1], -1);
        await expect(tx).to.be.changeTokenBalance(MyERC721, users[2], 1);
        await expect(tx).to.emit(MyERC721, "Transfer");
    });

    it("safeTransferFrom{4} test: trying to call function as non-owner, non-approved user and non-operator", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        await MyERC721.connect(users[1]).approve(users[2].address, 1);
        const tx = await MyERC721.connect(users[3]);

        await expect(tx["safeTransferFrom(address,address,uint256,bytes)"](users[1].address, users[2].address, 1, ethers.toUtf8Bytes("hello"))).to.be.revertedWith("Only owner of token, operators and approved user can transfer tokens");
    });

    it("safeTransferFrom{4} test: trying to transfer from users[1] to ContractNonReceiver as owner", async function(){
        const {MyERC721, users, ContractReceiverWrongDef} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        const tx = await MyERC721.connect(users[1]);

        await expect(tx["safeTransferFrom(address,address,uint256,bytes)"](users[1].address, ContractReceiverWrongDef.target, 1, ethers.toUtf8Bytes("bye"))).to.be.revertedWith("Wrong defenition of onERC721Received() in contract-receiver");
    });

    it("safeTransferFrom{4} test: trying to call function with invalid receiver address (0-address)", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        await MyERC721.connect(users[1]).approve(users[2].address, 1);
        const tx = await MyERC721.connect(users[2]);

        await expect(tx["safeTransferFrom(address,address,uint256,bytes)"](users[1].address, ethers.ZeroAddress, 1, ethers.toUtf8Bytes("random"))).to.be.revertedWith("Invalid receiver address");
    });

    it("safeTransferFrom{4} test: trying to transfer nft 1 from users[2] to users[3] as users[2]", async function(){
        const {MyERC721, users} = await loadFixture(deploy);
        await MyERC721.connect(users[1]).mint(users[1].address);
        const tx = await MyERC721.connect(users[2]);

        await expect(tx["safeTransferFrom(address,address,uint256,bytes)"](users[2].address, users[3].address, 1, ethers.toUtf8Bytes("hello"))).to.be.revertedWith("U can transfer tokens only from owner");
    });

    it("setMarketPlace test: set marketPlace as owner", async function() {
        const {MyERC721, users, MarketPlace} = await loadFixture(deploy);
        const tx = await MyERC721.connect(users[0]).setMarketPlace(MarketPlace.target);
        expect(tx).to.emit(MyERC721, "SetMarketPlace").withArgs(users[0].address, MarketPlace.target);
    });

    it("setMarketPlace test: trying set marketPlace as non-owner", async function() {
        const {MyERC721, users, MarketPlace} = await loadFixture(deploy);
        const tx = await MyERC721.connect(users[2]);
        await expect(tx.setMarketPlace(MarketPlace.target)).to.be.revertedWith("Only owner can set MarketPlace");
    });
    
});
