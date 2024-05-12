import hre from 'hardhat';
import { MegaFactory__factory, OwnableWhitelist__factory, PotPoolFactory__factory, RegularVaultFactory__factory, UpgradableStrategyFactory__factory } from '../typechain-types';
import { AddressLike } from 'ethers';

const ethers = hre.ethers;

export const prepareFactory = async (storage: AddressLike) => {
  try {

    const signers = await ethers.getSigners();
    
    const signer = signers[0]; // governance
    
    const megaFactory = await new MegaFactory__factory(signer).deploy(
      storage,
      signer.address
    );
    const potPoolFactory = await new PotPoolFactory__factory(signer).deploy();
    const regularVaultFactory = await new RegularVaultFactory__factory(
      signer
    ).deploy();
    const upgradableStrategyFactory =
    await new UpgradableStrategyFactory__factory(signer).deploy();
    const ownableWhitelist = await new OwnableWhitelist__factory(signer).deploy();
    
    await megaFactory.setVaultFactory(1, regularVaultFactory.target);
    await megaFactory.setPotPoolFactory(potPoolFactory.target);
    await megaFactory.setStrategyFactory(1, upgradableStrategyFactory.target);
    
    await potPoolFactory.setWhitelist(megaFactory.target, true);
    await regularVaultFactory.setWhitelist(megaFactory.target, true);
    await upgradableStrategyFactory.setWhitelist(megaFactory.target, true);
    
    return {
      megaFactory,
      potPoolFactory,
      regularVaultFactory,
      upgradableStrategyFactory,
      ownableWhitelist,
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
}