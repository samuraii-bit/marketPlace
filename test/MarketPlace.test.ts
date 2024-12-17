import {loadFixture, ethers, expect} from "./setup";
import {name, nftContractAddress} from "../contractInit";

describe("Testing MarketPlace", function() {

    async function deploy() {
        const users = await ethers.getSigners();
    
        const FactoryMyERC721 = await ethers.getContractFactory("MyERC721");
        const MyERC721 = await FactoryMyERC721.deploy("MyERC721", "MFT721", "https://gateway.pinata.cloud/ipfs/QmTMo6DFrfzKGGbkYsyMZRe16jBJcCcV72ZJHcM3a3Z2w7/");

        const FactoryMarketPlace = await ethers.getContractFactory(name);
        const MarketPlace = await FactoryMarketPlace.deploy(name, MyERC721.target);

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
        const {MarketPlace, users} = await loadFixture(deploy);
        await MarketPlace.connect(users[1]).createItem(users[1].address);
        
        const tx = MarketPlace.connect(users[1]).listItem(1, 1000);
        await expect(tx).to.emit(MarketPlace, "ListItem").withArgs(users[1].address, 1, 1000);
    });
    
});