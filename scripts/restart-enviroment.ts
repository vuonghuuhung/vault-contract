import hre from "hardhat";
import { Reader__factory } from "../typechain-types";
import { exit } from "process";

async function main() {
  try {
    await hre.ethernal.resetWorkspace("Hardhat Local Network");
    exit(0);
  } catch (e) {
    console.log(e);
  }
}

main().catch(console.error);
