import hre from "hardhat";
import {
  Reader__factory,
  VaultV2__factory,
} from "../typechain-types";
import { prepareAccount } from "./account";
import { exit } from "process";
import { prepareManager } from "./controller";
import { prepareFactory } from "./factories";
import { prepareVault } from "./vault";

const ethers = hre.ethers;

async function main() {
  console.log("Forking mainnet and starting deploy");

  console.log("Preparing accounts")
  const { governance, farmer } = await prepareAccount();

  console.log("Preparing manager")
  const {
    controller,
    storage,
    universalLiquidatorRegistry,
    feeRewardForwarder,
    notifyHelper,
    rewardForwarder,
    universalLiquidator,
  } = await prepareManager();

  console.log("Preparing factories")
  const {
    megaFactory,
    potPoolFactory,
    regularVaultFactory,
    upgradableStrategyFactory,
    ownableWhitelist,
  } = await prepareFactory(storage.target);

  const reader = await new Reader__factory(governance).deploy();

  const implementationVault = await new VaultV2__factory(governance).deploy();
  await implementationVault.waitForDeployment();
  await regularVaultFactory.changeDefaultImplementation(
    implementationVault.target
  );

  console.log("Deploying vaults");
  const {
    compoundVault,
    convex3CRVVault,
    convexCrvUSDUSDVault,
    convexCVXCRVVault,
    convexOETHVault,
    convexSTETHVault,
    idleDAIVault,
    idleUSDCVault,
    idleUSDTVault,
    yelWETHVault,
  } = await prepareVault(megaFactory);

  console.log("Deployed contracts");
  console.log({
    GOVERNANCE: governance.address,
    FARMER: farmer.address,
    CONTROLLER: controller.target,
    STORAGE: storage.target,
    UNIVERSAL_LIQUIDATOR_REGISTRY: universalLiquidatorRegistry.target,
    FEE_REWARD_FORWARDER: feeRewardForwarder.target,
    NOTIFY_HELPER: notifyHelper.target,
    REWARD_FORWARDER: rewardForwarder.target,
    UNIVERSAL_LIQUIDATOR: universalLiquidator.target,
    MEGA_FACTORY: megaFactory.target,
    POT_POOL_FACTORY: potPoolFactory.target,
    REGULAR_VAULT_FACTORY: regularVaultFactory.target,
    UPGRADABLE_STRATEGY_FACTORY: upgradableStrategyFactory.target,
    OWNABLE_WHITELIST: ownableWhitelist.target,
    READER: reader.target,
    COMPOUND_VAULT: compoundVault.target,
    CONVEX_3CRV_VAULT: convex3CRVVault.target,
    CONVEX_CRVUSDUSD_VAULT: convexCrvUSDUSDVault.target,
    CONVEX_CVXCRV_VAULT: convexCVXCRVVault.target,
    CONVEX_OETH_VAULT: convexOETHVault.target,
    CONVEX_STETH_VAULT: convexSTETHVault.target,
    IDLE_DAI_VAULT: idleDAIVault.target,
    IDLE_USDC_VAULT: idleUSDCVault.target,
    IDLE_USDT_VAULT: idleUSDTVault.target,
    YEL_WETH_VAULT: yelWETHVault.target,
  });

  exit(0);
}

main().catch(console.error);
