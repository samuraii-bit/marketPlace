import { ethers } from "hardhat";
import { contractAddress } from "./IMyERC721addresses.json";

export const name = "MarketPlace";
export const nftContractAddress = ethers.getAddress(contractAddress);
