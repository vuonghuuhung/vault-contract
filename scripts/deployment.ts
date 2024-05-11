import hre from "hardhat";
import { Reader__factory } from "../typechain-types";

async function main() {
    console.log("Forking mainnet and starting deploy");
    const signers = await hre.ethers.getSigners();
    const governance = signers[0];

    const reader = await new Reader__factory(governance).deploy();
    await reader.waitForDeployment();
    await hre.ethernal.push({
        name: 'Reader',
        address: reader.target.toString(),
        workspace: 'Hardhat Local Network' // Optional, will override the workspace set in hardhat.config for this call only
    });
    console.log("Reader deployed at", reader.target);
}

main().catch(console.error);