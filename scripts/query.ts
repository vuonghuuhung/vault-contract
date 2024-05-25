import { ethers } from "hardhat";
import { exit } from "process";

async function main() {
  const signer = await ethers.getSigners();

    const governance = signer[0];

    console.log(governance.address);

    const balance = await ethers.provider.getBalance(governance.address);
    console.log(balance.toString());

  exit(0);
}

main().catch(console.error);
