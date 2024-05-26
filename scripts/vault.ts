import { ethers } from "hardhat";
import {
  CompoundStrategyMainnet_WETH__factory,
  ConvexStrategyCvxCRVMainnet_cvxCRV__factory,
  ConvexStrategyMainnet_3CRV__factory,
  ConvexStrategyMainnet_OETH__factory,
  ConvexStrategyMainnet_crvUSD_USDC__factory,
  ConvexStrategyMainnet_stETH_ng__factory,
  IdleStrategyMainnet_DAI__factory,
  IdleStrategyMainnet_USDC__factory,
  IdleStrategyMainnet_USDT__factory,
  MegaFactory,
  VaultV1__factory,
  YelStrategyMainnet_YEL_WETH__factory,
} from "../typechain-types";
import config from "./fork-mainnet-config";

export const prepareVault = async (megaFactory: MegaFactory) => {
  try {
    const signers = await ethers.getSigners();

    const governance = signers[0];

    const compoundWETH = await new CompoundStrategyMainnet_WETH__factory(
      governance
    ).deploy();
    const convex3CRV = await new ConvexStrategyMainnet_3CRV__factory(
      governance
    ).deploy();
    const convexCrvUSDUSDC =
      await new ConvexStrategyMainnet_crvUSD_USDC__factory(governance).deploy();
    const convexCVXCRV = await new ConvexStrategyCvxCRVMainnet_cvxCRV__factory(
      governance
    ).deploy();
    const convexOETH = await new ConvexStrategyMainnet_OETH__factory(
      governance
    ).deploy();
    const convexSTETH = await new ConvexStrategyMainnet_stETH_ng__factory(
      governance
    ).deploy();
    const idleDAI = await new IdleStrategyMainnet_DAI__factory(
      governance
    ).deploy();
    const idleUSDC = await new IdleStrategyMainnet_USDC__factory(
      governance
    ).deploy();
    const idleUSDT = await new IdleStrategyMainnet_USDT__factory(
      governance
    ).deploy();
    const yelWETH = await new YelStrategyMainnet_YEL_WETH__factory(
      governance
    ).deploy();

    await megaFactory.createRegularVaultUsingUpgradableStrategy(
      "compound-weth",
      config.WETH_TOKEN,
      compoundWETH.target
    );
    await megaFactory.createRegularVaultUsingUpgradableStrategy(
      "convex-3crv",
      config.CURVE_3CRV_TOKEN,
      convex3CRV.target
    );
    await megaFactory.createRegularVaultUsingUpgradableStrategy(
      "convex-crvusd-usdc",
      config.CURVE_USD_USDC_TOKEN,
      convexCrvUSDUSDC.target
    );
    await megaFactory.createRegularVaultUsingUpgradableStrategy(
      "convex-cvxcrv",
      config.CURVE_CVX_CRV_TOKEN,
      convexCVXCRV.target
    );
    await megaFactory.createRegularVaultUsingUpgradableStrategy(
      "convex-oeth",
      config.CURVE_OETH_TOKEN,
      convexOETH.target
    );
    await megaFactory.createRegularVaultUsingUpgradableStrategy(
      "convex-steth",
      config.CURVE_STETH_TOKEN,
      convexSTETH.target
    );
    await megaFactory.createRegularVaultUsingUpgradableStrategy(
      "idle-dai",
      config.DAI_TOKEN,
      idleDAI.target
    );
    await megaFactory.createRegularVaultUsingUpgradableStrategy(
      "idle-usdc",
      config.USDC_TOKEN,
      idleUSDC.target
    );
    await megaFactory.createRegularVaultUsingUpgradableStrategy(
      "idle-usdt",
      config.USDT_TOKEN,
      idleUSDT.target
    );
    await megaFactory.createRegularVaultUsingUpgradableStrategy(
      "yel-weth",
      config.SUSHI_LP_TOKEN,
      yelWETH.target
    );

    const compoundVault = VaultV1__factory.connect((await megaFactory.completedDeployments("compound-weth")).NewVault, governance);
    const convex3CRVVault = VaultV1__factory.connect((await megaFactory.completedDeployments("convex-3crv")).NewVault, governance);
    const convexCrvUSDUSDVault = VaultV1__factory.connect((await megaFactory.completedDeployments("convex-crvusd-usdc")).NewVault, governance);
    const convexCVXCRVVault = VaultV1__factory.connect((await megaFactory.completedDeployments("convex-cvxcrv")).NewVault, governance);
    const convexOETHVault = VaultV1__factory.connect((await megaFactory.completedDeployments("convex-oeth")).NewVault, governance);
    const convexSTETHVault = VaultV1__factory.connect((await megaFactory.completedDeployments("convex-steth")).NewVault, governance);
    const idleDAIVault = VaultV1__factory.connect((await megaFactory.completedDeployments("idle-dai")).NewVault, governance);
    const idleUSDCVault = VaultV1__factory.connect((await megaFactory.completedDeployments("idle-usdc")).NewVault, governance);
    const idleUSDTVault = VaultV1__factory.connect((await megaFactory.completedDeployments("idle-usdt")).NewVault, governance);
    const yelWETHVault = VaultV1__factory.connect((await megaFactory.completedDeployments("yel-weth")).NewVault, governance);

    return {
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
    };
  } catch (error) {
    console.log(error);
    throw error;
  }
};
