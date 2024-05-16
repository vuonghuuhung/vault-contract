import { VaultProxy__factory, VaultV1__factory } from "../../typechain-types"
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

export const makeVault = async (deployer: HardhatEthersSigner, implementationAddress: string, ...initArgs) => {
    const vaultAsProxy = await new VaultProxy__factory(deployer).deploy(implementationAddress);
    const vault = VaultV1__factory.connect(vaultAsProxy.target.toString(), deployer);
    // @ts-expect-error the init Args are dynamic
    await vault.initializeVault(...initArgs);
    return vault;
}