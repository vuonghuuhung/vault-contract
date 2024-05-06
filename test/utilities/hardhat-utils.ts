import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import hre from "hardhat";
import { makeVault } from "./make-vault";

const impersonate = async (
  addresses: string[]
): Promise<HardhatEthersSigner[]> => {
  let signers: HardhatEthersSigner[] = [];
  for (let address of addresses) {
    signers.push(await hre.ethers.getImpersonatedSigner(address));
  }
  return signers;
};

const setUpCoreProtocol = async (config: any, signer: HardhatEthersSigner) => {
    const vaultImplementation = config.vaultImplementation;
    const vault = await makeVault(signer, vaultImplementation, config.underlyingAddress, 100, 100);


}
