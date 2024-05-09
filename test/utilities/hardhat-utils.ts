import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import hre, { ethers } from "hardhat";
import { makeVault } from "./make-vault";
import {
  CompoundStrategyMainnet_WETH,
  CompoundStrategyMainnet_WETH__factory,
  Controller__factory,
  FeeRewardForwarder__factory,
  IERC20,
  IdleStrategyMainnet_DAI,
  IdleStrategyMainnet_DAI__factory,
  IdleStrategyMainnet_USDC,
  IdleStrategyMainnet_USDC__factory,
  IdleStrategyMainnet_USDT,
  IdleStrategyMainnet_USDT__factory,
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
  UniversalLiquidator__factory,
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
  const storage = await new Storage__factory(signer).deploy();
  const vaultImplementation = config.vaultImplementation;
  const vault = await makeVault(
    signer,
    vaultImplementation,
    storage.target,
    config.underlyingAddress,
    100,
    100
  );

  const universalLiquidatorRegistry =
    await new UniversalLiquidatorRegistry__factory(signer).deploy(); // TODO: add path
  // console.log({ universalLiquidatorRegistry });
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
  const universalLiquidator = await new UniversalLiquidator__factory(
    signer
  ).deploy(); // TODO: set path registry

  await universalLiquidator.setPathRegistry(universalLiquidatorRegistry.target);

  // console.log({
  //   storage,
  //   vault,
  //   feeRewardForwarder,
  //   notifyHelper,
  //   rewardForwarder,
  //   universalLiquidator,
  // });
  const controller = await new Controller__factory(signer).deploy(
    storage.target,
    config.WETHToken,
    signer.address,
    notifyHelper.target,
    rewardForwarder.target,
    universalLiquidator.target,
    86400
  );

  const rewardTokens = [config.FARMToken];
  const rewardDistributions = [signer.address, feeRewardForwarder.target];

  const rewardPool = await new PotPool__factory(signer).deploy(
    rewardTokens,
    vault.target,
    64800,
    rewardDistributions,
    storage.target,
    "fPool",
    "fPool",
    await vault.decimals()
  );

  // TODO: fix hard code here
  await universalLiquidatorRegistry.addDex(
    ethers.keccak256(ethers.toUtf8Bytes("uniV3")),
    "0xc1D0465FF243fEcE2856Eac534C16cf1C8fb1aBA"
  );
  await universalLiquidatorRegistry.addDex(
    ethers.keccak256(ethers.toUtf8Bytes("banchorV2")),
    "0xaB8dB3Bbe95cb7E9f18a6c5bB9432553Eb59ec83"
  );
  await universalLiquidatorRegistry.addDex(
    ethers.keccak256(ethers.toUtf8Bytes("sushiSwap")),
    "0x5dDA716093424Eeb347d05BB65Fc0b601A53B9b1"
  );
  await universalLiquidatorRegistry.setIntermediateToken([
    "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  ]);

  if (config.liquidation) {
    for (let i = 0; i < config.liquidation.length; i++) {
      const dex = Object.keys(config.liquidation[i])[0];
      const dexNameInBytes = ethers.keccak256(ethers.toUtf8Bytes(dex));
      await universalLiquidatorRegistry.setPath(
        dexNameInBytes,
        config.liquidation[i][dex]
      );
    }
  }

  // default arguments are storage and vault addresses
  config.strategyArgs = config.strategyArgs || [storage.target, vault.target];

  for (let i = 0; i < config.strategyArgs.length; i++) {
    if (config.strategyArgs[i] == "storageAddr") {
      config.strategyArgs[i] = storage.target;
    } else if (config.strategyArgs[i] == "vaultAddr") {
      config.strategyArgs[i] = vault.target;
    } else if (config.strategyArgs[i] == "poolAddr") {
      config.strategyArgs[i] = rewardPool.target;
    } else if (config.strategyArgs[i] == "universalLiquidatorRegistryAddr") {
      config.strategyArgs[i] = universalLiquidatorRegistry.target;
    }
  }

  let strategy: CompoundStrategyMainnet_WETH | IdleStrategyMainnet_DAI | IdleStrategyMainnet_USDC | IdleStrategyMainnet_USDT | null = null;
  if (config.strategyType == "compound") {
    const implementation = await new CompoundStrategyMainnet_WETH__factory(
      signer
    ).deploy();
    const strategyProxy = await new StrategyProxy__factory(signer).deploy(
      implementation.target
    );
    strategy = CompoundStrategyMainnet_WETH__factory.connect(
      strategyProxy.target.toString(),
      signer
    );
    await strategy.initializeStrategy(...config.strategyArgs);
    await vault.setStrategy(strategy.target);
  } 
  
  if (config.strategyType == "idle-dai") {
    const implementation = await new IdleStrategyMainnet_DAI__factory(
      signer
    ).deploy();
    const strategyProxy = await new StrategyProxy__factory(signer).deploy(
      implementation.target
    );
    strategy = IdleStrategyMainnet_DAI__factory.connect(
      strategyProxy.target.toString(),
      signer
    );
    await strategy.initializeStrategy(...config.strategyArgs);
    await vault.setStrategy(strategy.target);
  }

  if (config.strategyType == "idle-usdc") {
    const implementation = await new IdleStrategyMainnet_USDC__factory(
      signer
    ).deploy();
    const strategyProxy = await new StrategyProxy__factory(signer).deploy(
      implementation.target
    );
    strategy = IdleStrategyMainnet_USDC__factory.connect(
      strategyProxy.target.toString(),
      signer
    );
    await strategy.initializeStrategy(...config.strategyArgs);
    await vault.setStrategy(strategy.target);
  }

  if (config.strategyType == "idle-usdt") {
    const implementation = await new IdleStrategyMainnet_USDT__factory(
      signer
    ).deploy();
    const strategyProxy = await new StrategyProxy__factory(signer).deploy(
      implementation.target
    );
    strategy = IdleStrategyMainnet_USDT__factory.connect(
      strategyProxy.target.toString(),
      signer
    );
    await strategy.initializeStrategy(...config.strategyArgs);
    await vault.setStrategy(strategy.target);
  }

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
    strategy,
  };
};

const depositToVault = async (
  _farmer: HardhatEthersSigner,
  _underlying: IERC20,
  _vault: VaultV1,
  _amount: BigNumberish
) => {
  await _underlying.connect(_farmer).approve(_vault.target, _amount);
  await _vault.connect(_farmer).deposit(_amount);
};

const setupFactory = async (signer: HardhatEthersSigner, storage: string) => {
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
};

export { impersonate, setUpCoreProtocol, depositToVault, setupFactory };
