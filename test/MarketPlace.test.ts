import {loadFixture, ethers, expect, time} from "./setup";
import {name, nftContractAddress} from "../contractInit";

describe("Testing MarketPlace", function() {

    async function deploy() {
        const users = await ethers.getSigners();
    
        const FactoryMyERC721 = await ethers.getContractFactory("MyERC721");
        const MyERC721 = await FactoryMyERC721.deploy("MyERC721", "MFT721", "https://gateway.pinata.cloud/ipfs/QmTMo6DFrfzKGGbkYsyMZRe16jBJcCcV72ZJHcM3a3Z2w7/");

        const FactoryMarketPlace = await ethers.getContractFactory(name);
        const MarketPlace = await FactoryMarketPlace.deploy(name, MyERC721.target);

        await MyERC721.connect(users[0]).setMarketPlace(MarketPlace.target);

        return {users, MarketPlace, MyERC721};
    }

    it("Deployment test", async function(){
        const {MarketPlace} = await loadFixture(deploy);
        expect(MarketPlace.target).to.be.properAddress;
    });

    it("createItem test: just create an item for marketPlace contract", async function(){
        const {MarketPlace} = await loadFixture(deploy);
        const tx = await MarketPlace.createItem(MarketPlace.target);
        
        await expect(tx).to.emit(MarketPlace, "CreateItem").withArgs(MarketPlace.target);
    });

    
    it("createItem test: trying to create item for other users[1]", async function(){
        const {MarketPlace, users} = await loadFixture(deploy);
        const tx = await MarketPlace.connect(users[1]).createItem(users[1].address);
        
        await expect(tx).to.emit(MarketPlace, "CreateItem").withArgs(users[1].address);
    });
    
    
    it("listItem test: trying to list NFT as owner", async function(){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        
        const tx = await MarketPlace.connect(users[1]).listItem(1, 1000);
        await expect(tx).to.emit(MarketPlace, "ListItem").withArgs(users[1].address, 1, 1000);
        expect((await MarketPlace.listings(1)).seller == users[1].address);
        expect(await MyERC721.ownerOf(1)).to.be.equal(MarketPlace.target);
    });

    it("listItem test: trying to list NFT as operator", async function(){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MyERC721.connect(users[1]).setApprovalForAll(users[2].address, true);
        
        const tx = await MarketPlace.connect(users[2]);
        await expect(tx.listItem(1, 1000)).to.be.revertedWith("Only owner can list or cancel listening NFT");
    });

    it("buyItem test: buy nft with id 1 from users[1] as users[2]", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItem(1, 1000);

        const tx = MarketPlace.connect(users[2]).buyItem(1, {value: 1000});
        await expect(tx).to.emit(MarketPlace, "BuyItem").withArgs(users[2].address, 1, 1000, users[1].address);
        await expect(tx).to.changeEtherBalances([users[2] , users[1]], [-1000, 1000]);
        await expect((await MarketPlace.listings(1)).seller).to.be.equal(ethers.ZeroAddress); 
        await expect(await MyERC721.ownerOf(1)).to.be.equal(users[2].address);
    });

    it("buyItem test: trying to buy nft with id 1 from users[1] as users[2] with sum 1001", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItem(1, 1000);

        const tx = MarketPlace.connect(users[2]);
        await expect(tx.buyItem(1, {value: 1001})).to.be.revertedWith("Wrong sum");
        await expect((await MarketPlace.listings(1)).seller == ethers.ZeroAddress); 
    });

    it("buyItem test: trying to buy nft with id 1 from users[1] as users[2] with sum 999", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItem(1, 1000);

        const tx = MarketPlace.connect(users[2]);
        await expect(tx.buyItem(1, {value: 999})).to.be.revertedWith("Wrong sum");
        await expect((await MarketPlace.listings(1)).seller).to.be.equal(users[1].address); 
    });

    it("cancel test: list nft 1 and cancel listing of it", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItem(1, 1000);

        const tx = MarketPlace.connect(users[1]).cancel(1);
        await expect(tx).to.emit(MarketPlace, "CancelListing").withArgs(users[1], 1);
        await expect((await MarketPlace.listings(1)).seller).to.be.equal(ethers.ZeroAddress);
        await expect(await MyERC721.ownerOf(1)).to.be.equal(users[1].address);
    });

    it("cancel test: trying to list nft 1 and cancel listing of it as users[2]", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItem(1, 1000);

        const tx = MarketPlace.connect(users[2]);
        await expect(tx.cancel(1)).to.be.revertedWith("Only owner can list or cancel listening NFT");
        expect((await MarketPlace.listings(1)).seller).to.be.equal(users[1].address); 
    });

    it("listItemOnAuction test: list nft 1 on auction", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        const tx = await MarketPlace.connect(users[1]).listItemOnAuction(1, 1000);

        await expect(tx).to.emit(MarketPlace, "ListItemOnAuction").withArgs(users[1].address, 1, 1000);
        await expect((await MarketPlace.auctions(1)).seller).to.be.equal(users[1].address);
        await expect(await MyERC721.ownerOf(1)).to.be.equal(MarketPlace.target);
    });

    it("listItemOnAuction test: trying to list nft 1 as users[2]", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        const tx = await MarketPlace.connect(users[2]);

        await expect(tx.listItemOnAuction(1, 1000)).to.be.revertedWith("Only owner can list or cancel listening NFT");
    });

    it("makeBid test: make bid on nft1 with sum 1001", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItemOnAuction(1, 1000);
        const tx = await MarketPlace.connect(users[2]).makeBid(1, {value: 1001});
        
        await expect(tx).to.emit(MarketPlace, "MakeBid").withArgs(users[2].address, 1, 1001);
        await expect((await MarketPlace.auctions(1)).highestBid).to.be.equal(1001);
        await expect((await MarketPlace.auctions(1)).candidate).to.be.equal(users[2].address);
        await expect((await MarketPlace.auctions(1)).bidsCount).to.be.equal(1);
        await expect(tx).to.changeEtherBalances([users[2], MarketPlace.target], [-1001, 1001]);
    });

    it("makeBid test: make bid on nft1 with sum 1010 and then with sum 1001", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItemOnAuction(1, 1000);
        await MarketPlace.connect(users[2]).makeBid(1, {value: 1010});
        const tx = await MarketPlace.connect(users[3]);

        await expect(tx.makeBid(1, {value: 1001})).to.be.revertedWith("The bid is less than highest bid offered for this NFT");
    });

    it("makeBid test: make bid on nft1 with sum 999", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItemOnAuction(1, 1000);
        const tx = await MarketPlace.connect(users[2]);

        await expect(tx.makeBid(1, {value: 999})).to.be.revertedWith("The bid is less than start price of this NFT");
    });

    it("makeBid test: make bid on nft1 with sum 1001 and the with sum 1002", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItemOnAuction(1, 1000);
        const tx1 = await MarketPlace.connect(users[2]).makeBid(1, {value: 1001});
        await expect(tx1).to.emit(MarketPlace, "MakeBid").withArgs(users[2].address, 1, 1001);
        const tx2 = await MarketPlace.connect(users[3]).makeBid(1, {value: 1002});
        
        await expect(tx2).to.changeEtherBalances([users[2], users[3], MarketPlace.target], [1001, -1002, 1002 - 1001]);
        await expect(tx2).to.emit(MarketPlace, "MakeBid").withArgs(users[3].address, 1, 1002);
        await expect((await MarketPlace.auctions(1)).highestBid).to.be.equal(1002);
        await expect((await MarketPlace.auctions(1)).candidate).to.be.equal(users[3].address);
        await expect((await MarketPlace.auctions(1)).bidsCount).to.be.equal(2);
    });

    it("makeBid test: make bid on non exist auction", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        const tx = await MarketPlace.connect(users[2]);

        await expect(tx.makeBid(1, {value: 100000})).to.be.revertedWith("Auction doesn't exist");
    });

    it("makeBid test: make 1st bid after 3 days", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItemOnAuction(1, 1000);
        const threeDaysLater = (await time.latest()) + 3 * 24 * 60 * 60;
        await time.increaseTo(threeDaysLater);

        const tx = await MarketPlace.connect(users[2]).makeBid(1, {value: 1000000});
        const receipt = await tx.wait();

        await expect(Boolean(receipt?.status)).to.be.equal(true);
        await expect(tx).emit(MarketPlace, "FinishAuction").withArgs(users[2].address, 1, ethers.ZeroAddress);
        await expect((await MarketPlace.auctions(1)).seller).to.be.equal(ethers.ZeroAddress);
        await expect(await MyERC721.ownerOf(1)).to.be.equal(users[1].address);
    });

    it("makeBid test: make 2nd bid after 3 days", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItemOnAuction(1, 1000);
        await MarketPlace.connect(users[2]).makeBid(1, {value: 1001});
        const threeDaysLater = (await time.latest()) + 3 * 24 * 60 * 60;
        await time.increaseTo(threeDaysLater);

        const tx = await MarketPlace.connect(users[3]).makeBid(1, {value: 1000000});
        const receipt = await tx.wait();

        await expect(Boolean(receipt?.status)).to.be.equal(true);
        await expect(tx).emit(MarketPlace, "FinishAuction").withArgs(users[3].address, 1, ethers.ZeroAddress);
        await expect((await MarketPlace.auctions(1)).seller).to.be.equal(ethers.ZeroAddress);
        await expect(await MyERC721.ownerOf(1)).to.be.equal(users[1].address);
    });

    it("makeBid test: make 3rd bid after 3 days", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItemOnAuction(1, 1000);
        await MarketPlace.connect(users[2]).makeBid(1, {value: 1001});
        await MarketPlace.connect(users[3]).makeBid(1, {value: 1010});
        const threeDaysLater = (await time.latest()) + 3 * 24 * 60 * 60;
        await time.increaseTo(threeDaysLater);

        const tx = await MarketPlace.connect(users[4]).makeBid(1, {value: 1000000});
        const receipt = await tx.wait();

        await expect(Boolean(receipt?.status)).to.be.equal(true);
        await expect((await MarketPlace.auctions(1)).seller).to.be.equal(ethers.ZeroAddress);
        await expect(tx).emit(MarketPlace, "FinishAuction").withArgs(users[4].address, 1, ethers.ZeroAddress);
        await expect(await MyERC721.ownerOf(1)).to.be.equal(users[1].address);
    });

    it("makeBid test: make 4th bid after 3 days", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItemOnAuction(1, 1000);
        await MarketPlace.connect(users[2]).makeBid(1, {value: 1001});
        await MarketPlace.connect(users[3]).makeBid(1, {value: 1010});
        await MarketPlace.connect(users[2]).makeBid(1, {value: 1011});
        const threeDaysLater = (await time.latest()) + 3 * 24 * 60 * 60;
        await time.increaseTo(threeDaysLater);

        const tx = await MarketPlace.connect(users[4]).makeBid(1, {value: 2000});
        const receipt = await tx.wait();

        await expect(Boolean(receipt?.status)).to.be.equal(true);
        await expect(tx).to.emit(MarketPlace, "MakeBid").withArgs(users[4].address, 1, 2000);
        await expect((await MarketPlace.auctions(1)).highestBid).to.be.equal(2000);
        await expect((await MarketPlace.auctions(1)).candidate).to.be.equal(users[4].address);
        await expect((await MarketPlace.auctions(1)).bidsCount).to.be.equal(4);
    });

    it("finishAuction test: finish auction after 4th bid", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItemOnAuction(1, 1000);
        await MarketPlace.connect(users[2]).makeBid(1, {value: 1001});
        await MarketPlace.connect(users[3]).makeBid(1, {value: 1010});
        await MarketPlace.connect(users[2]).makeBid(1, {value: 1011});
        const threeDaysLater = (await time.latest()) + 3 * 24 * 60 * 60;
        await time.increaseTo(threeDaysLater);

        const bigBidTx = await MarketPlace.connect(users[4]).makeBid(1, {value: 1000000});
        const tx = await MarketPlace.connect(users[1]).finishAuction(1);

        await expect(tx).emit(MarketPlace, "FinishAuction").withArgs(users[1].address, 1, users[4].address);
        await expect((await MarketPlace.auctions(1)).seller).to.be.equal(ethers.ZeroAddress);
        await expect(await MyERC721.ownerOf(1)).to.be.equal(users[4].address);
    });

    it("finishAuction test: finish auction before 3 days", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItemOnAuction(1, 1000);
        await MarketPlace.connect(users[2]).makeBid(1, {value: 1001});
        await MarketPlace.connect(users[3]).makeBid(1, {value: 1010});
        await MarketPlace.connect(users[2]).makeBid(1, {value: 1011});

        const bigBidTx = await MarketPlace.connect(users[4]).makeBid(1, {value: 1000000});
        const tx = await MarketPlace.connect(users[1]);

        await expect(tx.finishAuction(1)).to.be.revertedWith("U cannot finish the auction less than three days after it starts");
    });

    it("finishAuction test: trying to finish auction after 4th bid as non-owner", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItemOnAuction(1, 1000);
        await MarketPlace.connect(users[2]).makeBid(1, {value: 1001});
        await MarketPlace.connect(users[3]).makeBid(1, {value: 1010});
        await MarketPlace.connect(users[2]).makeBid(1, {value: 1011});

        const bigBidTx = await MarketPlace.connect(users[3]).makeBid(1, {value: 1020});
        const tx = await MarketPlace.connect(users[3]);

        await expect(tx.finishAuction(1)).to.be.revertedWith("Only owner can list or cancel listening NFT");
        await expect((await MarketPlace.auctions(1)).seller).to.be.equal(users[1].address);
        await expect(await MyERC721.ownerOf(1)).to.be.equal(MarketPlace.target);
    });

    it("finishAuction test: trying to finish auction that doesnt exist after", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        const tx = await MarketPlace.connect(users[3]);

        await expect(tx.finishAuction(1)).to.be.revertedWith("Auction doesn't exist");
    });
    
    it("cancelAuction test: trying to cancel auction after 3 days", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItemOnAuction(1, 1000);
        await MarketPlace.connect(users[2]).makeBid(1, {value: 1001});
        await MarketPlace.connect(users[3]).makeBid(1, {value: 1010});
        await MarketPlace.connect(users[2]).makeBid(1, {value: 1011});
        const threeDaysLater = (await time.latest()) + 3 * 24 * 60 * 60;
        await time.increaseTo(threeDaysLater);

        const tx = await MarketPlace.connect(users[1]).cancelAuction(1);

        await expect(tx).emit(MarketPlace, "CancelAuction").withArgs(users[1].address, 1);
        await expect((await MarketPlace.auctions(1)).seller).to.be.equal(ethers.ZeroAddress);
        await expect(await MyERC721.ownerOf(1)).to.be.equal(users[1].address);;
    });

    it("cancelAuction test: trying to cancel auction before 3 days", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItemOnAuction(1, 1000);
        await MarketPlace.connect(users[2]).makeBid(1, {value: 1001});
        await MarketPlace.connect(users[3]).makeBid(1, {value: 1010});
        await MarketPlace.connect(users[4]).makeBid(1, {value: 10000});

        const tx = await MarketPlace.connect(users[1]).cancelAuction(1);

        await expect(tx).emit(MarketPlace, "CancelAuction").withArgs(users[1].address, 1);
        await expect((await MarketPlace.auctions(1)).seller).to.be.equal(ethers.ZeroAddress);
        await expect(await MyERC721.ownerOf(1)).to.be.equal(users[1].address);;
    }); 

    it("cancelAuction test: trying to cancel auction that doesnt exist after 4th bid as non-owner", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        const tx = await MarketPlace.connect(users[3]);

        await expect(tx.cancelAuction(1)).to.be.revertedWith("Auction doesn't exist");
    });

    it("cancelAuction test: trying to cancel auction before 3 days as non-owner", async function (){
        const {MarketPlace, users, MyERC721} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        await MarketPlace.connect(users[1]).listItemOnAuction(1, 1000);
        await MarketPlace.connect(users[2]).makeBid(1, {value: 1001});
        await MarketPlace.connect(users[3]).makeBid(1, {value: 1010});
        await MarketPlace.connect(users[4]).makeBid(1, {value: 10000});

        const tx = await MarketPlace.connect(users[2]);

        await expect(tx.cancelAuction(1)).to.be.revertedWith("Only owner can list or cancel listening NFT");
        await expect((await MarketPlace.auctions(1)).seller).to.be.equal(users[1].address);
        await expect(await MyERC721.ownerOf(1)).to.be.equal(MarketPlace.target);
    }); 
});