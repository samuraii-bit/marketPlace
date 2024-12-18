import { HardhatUserConfig, task } from "hardhat/config";
import { contractAddress } from "./IMyERC721addresses.json";
import "@nomicfoundation/hardhat-toolbox";
require("dotenv").config();

const name = "MarketPlace";
const nftContractAddress = contractAddress;

task("mint", "Minting an NFT for account")
  .addParam("account", "The account's address")
    .setAction(async (taskArgs, hre) => {
      const accountAddress = taskArgs.account;
      const [signer] = await hre.ethers.getSigners();
      const nftContract = await hre.ethers.getContractAt(name, nftContractAddress);
      const tx = await nftContract.connect(signer).createItem(accountAddress);
      tx.wait();
    });

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      chainId: 1337,
    },
    sepolia: {
      url: process.env.SEPOLIA_URL,
      accounts: process.env.PRIVATE_KEYS ? process.env.PRIVATE_KEYS.split(",") : [],
    },
    holesky: {
      url: process.env.HOLESKY_URL,
      accounts: process.env.PRIVATE_KEYS ? process.env.PRIVATE_KEYS.split(",") : [],
    }
  },
  etherscan :{
    apiKey: process.env.ETHERSCAN_API,
  },
};

export default config;
