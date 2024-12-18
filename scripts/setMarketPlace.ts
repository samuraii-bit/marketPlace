import { ethers } from "hardhat";
import {name as marketPlaceName, nftContractAddress} from "../contractInit";
import {name as tokenName, symbol, baseTokenURI} from "../tokenInit";
import {contractAddress as marketPlaceAddress} from "../MarketPlaceAddresses.json";

async function main() {
    const users = await ethers.getSigners();
    
    const MyERC721 = await ethers.getContractAt(tokenName, nftContractAddress);
    const MarketPlace = await ethers.getContractAt(marketPlaceName, marketPlaceAddress);

    await MyERC721.connect(users[0]).setMarketPlace(MarketPlace.target);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});