import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

task("mint", "Minting an NFT for account")
  .addParam("account", "The account's address")
    .setAction(async (taskArgs, hre) => {
      const accountAddress = taskArgs.account;
      const [signer] = await hre.ethers.getSigners();
      const nftContract = await hre.ethers.getContractAt("MarketPlace", "0x822254a94De2FF36d10994fcf4EF217F6b510296");
      const tx = await nftContract.connect(signer).createItem(accountAddress);
      tx.wait();
    });

const config: HardhatUserConfig = {
  solidity: "0.8.28",
};

export default config;
