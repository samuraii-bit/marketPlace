import { writeFileSync } from 'fs';
import { ethers } from "hardhat";
import {name, nftContractAddress} from "../contractInit";

async function main() {
    const marketPlace = await ethers.getContractFactory(name);
    const MarketPlace = await marketPlace.deploy(name, nftContractAddress);

    await MarketPlace.waitForDeployment();

    console.log(`Contract deployed to: ${MarketPlace.target}`);
    const addresses = {contractAddress: MarketPlace.target, ownerAddress: MarketPlace.deploymentTransaction()?.from};
    writeFileSync("addresses.json", JSON.stringify(addresses, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});