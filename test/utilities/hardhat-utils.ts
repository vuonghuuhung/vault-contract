import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import hre, { ethers } from "hardhat";
import { makeVault } from "./make-vault";
import {
  Controller__factory,
  FeeRewardForwarder__factory,
  IERC20,
  MegaFactory__factory,
  NotifyHelper__factory,
  OwnableWhitelist__factory,
  PotPoolFactory__factory,
  PotPool__factory,
  RegularVaultFactory__factory,
  RewardForwarder__factory,
  Storage__factory,
  StrategyProxy__factory,
  UniversalLiquidatorRegistry__factory,
  UpgradableStrategyFactory__factory,
  VaultV1,
} from "../../typechain-types";
import { BigNumberish } from "ethers";

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
  const vault = await makeVault(
    signer,
    vaultImplementation,
    config.underlyingAddress,
    100,
    100
  );

  const storage = await new Storage__factory(signer).deploy();
  const universalLiquidatorRegistry =
    await new UniversalLiquidatorRegistry__factory(signer).deploy(); // TODO: add path
  const feeRewardForwarder = await new FeeRewardForwarder__factory(
    signer
  ).deploy(
    storage.target,
    config.FARMToken,
    config.IFARMToken,
    universalLiquidatorRegistry.target
  );
  const notifyHelper = await new NotifyHelper__factory(signer).deploy(
    storage.target,
    feeRewardForwarder.target,
    config.FARMToken
  );
  const rewardForwarder = await new RewardForwarder__factory(signer).deploy(
    storage.target
  );
  const universalLiquidator = await new UniversalLiquidatorRegistry__factory(
    signer
  ).deploy(); // TODO: set path registry
  const controller = await new Controller__factory(signer).deploy(
    storage.target,
    config.WETHToken,
    signer.address,
    notifyHelper.target,
    rewardForwarder.target,
    universalLiquidator.target,
    0
  );

  const rewardTokens = config.rewardPoolConfig.rewardTokens || [
    config.FARMToken,
  ];
  const rewardDistributions = [signer.address, feeRewardForwarder.target];

  const rewardPool = await new PotPool__factory(signer).deploy(
    rewardTokens,
    vault.target,
    64800,
    rewardDistributions,
    storage.target,
    "fPool",
    "fPool",
    18
  );

  if (config.liquidation) {
    for (let i = 0; i < config.liquidation.length; i++) {
      const dex = Object.keys(config.liquidation[i])[0];
      await universalLiquidatorRegistry.setPath(
        ethers.keccak256(dex),
        config.liquidation[i][dex]
      );
    }
  }

  // default arguments are storage and vault addresses
  config.strategyArgs = config.strategyArgs || [
    storage.target,
    vault.target
  ];

  for(let i = 0; i < config.strategyArgs.length ; i++){
    if(config.strategyArgs[i] == "storageAddr") {
      config.strategyArgs[i] = storage.target;
    } else if(config.strategyArgs[i] == "vaultAddr") {
      config.strategyArgs[i] = vault.target;
    } else if(config.strategyArgs[i] == "poolAddr" ){
      config.strategyArgs[i] = rewardPool.target;
    } else if(config.strategyArgs[i] == "universalLiquidatorRegistryAddr"){
      config.strategyArgs[i] = universalLiquidatorRegistry.target;
    }
  }

  const strategyProxy = await new StrategyProxy__factory(signer).deploy(config.strategyImplementation);
  await (strategyProxy as any).initializeStrategy(
    ...config.strategyArgs,
  );

  await vault.setStrategy(strategyProxy.target);
  await storage.setController(controller.target);

  return {
    vault,
    storage,
    controller,
    feeRewardForwarder,
    notifyHelper,
    rewardForwarder,
    universalLiquidatorRegistry,
    rewardPool,
    strategyProxy,
  };
};

const depositToVault = async (_farmer: HardhatEthersSigner, _underlying: IERC20, _vault: VaultV1, _amount: BigNumberish) => {
  await _underlying.connect(_farmer).approve(_vault.target, _amount);
  await _vault.connect(_farmer).deposit(_amount);
}

const setupFactory = async (signer: HardhatEthersSigner, storage: string) => {
  const megaFactory = await new MegaFactory__factory(signer).deploy(storage, signer.address);
  const potPoolFactory = await new PotPoolFactory__factory(signer).deploy();
  const regularVaultFactory = await new RegularVaultFactory__factory(signer).deploy();
  const upgradableStrategyFactory = await new UpgradableStrategyFactory__factory(signer).deploy();
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
    ownableWhitelist
  };
}

export { impersonate, setUpCoreProtocol, depositToVault, setupFactory };