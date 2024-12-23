import { ethers } from "hardhat";
import readline from "readline-sync";
import {contractAddress} from '../IMyERC721Addresses.json';
import {name, symbol, baseTokenURI} from "../tokenInit";

async function main() {
    let mintAddress: string;

    mintAddress = ethers.getAddress(readline.question("Please enter the address for which u want mint NFT: "));
    while (!ethers.isAddress(mintAddress)){
        mintAddress = ethers.getAddress(readline.question("An invalid adddress was entered. Please, try again: "));
    }

    const MyERC721Factory = await ethers.getContractAt(name, contractAddress);
    const users = await ethers.getSigners();

    const tx = await MyERC721Factory.connect(users[0]).mint(mintAddress);
    const receipt = await tx.wait();

    if (receipt?.status === 1) {
        console.log(`NFT successfully minted on ${mintAddress}`);
    } else {
        console.error("Transaction failed");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});