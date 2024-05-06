import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import hre from "hardhat";
import { makeVault } from "./make-vault";
import { Controller__factory, FeeRewardForwarder__factory, NotifyHelper__factory, RewardForwarder__factory, Storage__factory, UniversalLiquidatorRegistry__factory } from "../../typechain-types";

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

    const storage = await new Storage__factory(signer).deploy();
    const universalLiquidatorRegistry = await new UniversalLiquidatorRegistry__factory(signer).deploy(); // TODO: add path
    const feeRewardForwarder = await new FeeRewardForwarder__factory(signer).deploy(storage.target, config.FARMToken, config.IFARMToken, universalLiquidatorRegistry.target);
    const notifyHelper = await new NotifyHelper__factory(signer).deploy(storage.target, feeRewardForwarder.target, config.FARMToken);
    const rewardForwarder = await new RewardForwarder__factory(signer).deploy(storage.target);
    const universalLiquidator = await new UniversalLiquidatorRegistry__factory(signer).deploy(); // TODO: set path registry
    const controller = await new Controller__factory(signer).deploy(storage.target, config.WETHToken, signer.address, notifyHelper.target, rewardForwarder.target, universalLiquidator.target, 43200);

    
}
