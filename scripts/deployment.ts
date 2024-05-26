import {
  ERC20__factory,
  IUniswapV2Router02__factory,
  Reader__factory,
  VaultV2__factory,
} from "../typechain-types";
import { prepareAccount } from "./account";
import { exit } from "process";
import { prepareManager } from "./controller";
import { prepareFactory } from "./factories";
import { prepareVault } from "./vault";
import { ethers } from "hardhat";
import config from "./fork-mainnet-config";
import { depositToVault } from "./helpers";

async function main() {
  console.log("Forking mainnet and starting deploy");

  console.log("Preparing accounts");
  const { governance, farmer } = await prepareAccount();

  console.log("Preparing manager");
  const {
    controller,
    storage,
    universalLiquidatorRegistry,
    feeRewardForwarder,
    notifyHelper,
    rewardForwarder,
    universalLiquidator,
  } = await prepareManager();

  console.log("Preparing factories");
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

  // Additional logic for providing more balance to farmer
  const signers = await ethers.getSigners();

  // stETH vault
  let account = signers[3];
  let abi = [
    "function add_liquidity(uint256[2] _amounts,uint256 _min_mint_amount)",
  ];
  const stETHngPool = new ethers.Contract(
    config.CURVE_STETH_TOKEN,
    abi,
    account
  );
  await stETHngPool.add_liquidity([ethers.parseEther("1000"), 0], 1, {
    value: ethers.parseEther("1000"),
  }); // 1000 ETH
  let underlying = ERC20__factory.connect(
    await convexSTETHVault.underlying(),
    account
  );
  let balance = await underlying.balanceOf(account.address);
  await underlying.transfer(farmer.address, balance);

  // oETH vault
  account = signers[4];
  abi = [
    "function add_liquidity(uint256[2] _amounts,uint256 _min_mint_amount)",
  ];
  const oETHngPool = new ethers.Contract(config.CURVE_OETH_TOKEN, abi, account);
  await oETHngPool.add_liquidity([ethers.parseEther("1000"), 0], 1, {
    value: ethers.parseEther("1000"),
  }); // 1000 ETH
  underlying = ERC20__factory.connect(
    await convexOETHVault.underlying(),
    account
  );
  balance = await underlying.balanceOf(account.address);
  await underlying.transfer(farmer.address, balance);

  // usd-usdc vault
  abi = [
    "function add_liquidity(uint256[2] _amounts,uint256 _min_mint_amount)",
  ];
  const usdUSDCngPool = new ethers.Contract(
    "0x4DEcE678ceceb27446b35C672dC7d61F30bAD69E",
    abi,
    farmer
  );
  const usdc = ERC20__factory.connect(config.USDC_TOKEN, farmer);
  // console.log({usdcBalance: await usdc.balanceOf(farmer.address)});
  await (
    await usdc.approve(usdUSDCngPool.target, ethers.parseUnits("1000000", 6))
  ).wait();
  await usdUSDCngPool.add_liquidity([ethers.parseUnits("1000000", 6), 0], 1); // 1000000 USDC
  underlying = ERC20__factory.connect(
    await convexCrvUSDUSDVault.underlying(),
    farmer
  );
  balance = await underlying.balanceOf(farmer.address);

  // yel-eth vault
  const yelWhale = await ethers.getImpersonatedSigner(
    "0x533e3c0e6b48010873B947bddC4721b1bDFF9648"
  );
  const yel = ERC20__factory.connect(config.YEL_TOKEN, yelWhale);
  await yel.transfer(farmer.address, await yel.balanceOf(yelWhale.address));
  const routerV2 = IUniswapV2Router02__factory.connect(
    "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
    farmer
  );
  const block = await ethers.provider.getBlockNumber();
  const blockTimestamp = (await ethers.provider.getBlock(block))?.timestamp;
  const weth = ERC20__factory.connect(config.WETH_TOKEN, farmer);
  console.log({ balanceWETH: await weth.balanceOf(farmer.address) });
  await weth.approve(routerV2.target, ethers.parseEther("8000"));
  await yel
    .connect(farmer)
    .approve(routerV2.target, await yel.balanceOf(farmer.address));
  await routerV2.addLiquidity(
    config.WETH_TOKEN,
    config.YEL_TOKEN,
    ethers.parseEther("8000"),
    await yel.balanceOf(farmer.address),
    0,
    0,
    farmer.address,
    blockTimestamp! + 3600
  );
  underlying = ERC20__factory.connect(await yelWETHVault.underlying(), farmer);
  balance = await underlying.balanceOf(farmer.address);

  /* 
  Vault: convex-crvusd-usdc - able to deposit 992531.552021096552748228 crvUSDUSDC-f
  Vault: convex-cvxcrv - able to deposit 2000003.974321627646713003 cvxCRV
  Vault: compound-weth - able to deposit 27913.368504940975621465 WETH
  Vault: convex-3crv - able to deposit 1378054.019235561671257245 3Crv
  Vault: idle-usdt - able to deposit 5536278441.379697 USDT
  Vault: yel-weth - able to deposit 137844.580501172713131144 SLP
  Vault: idle-dai - able to deposit 35999972.0 DAI
  Vault: convex-steth - able to deposit 1053.448788708330231076 stETH-ng-f
  Vault: idle-usdc - able to deposit 999000000.0 USDC
  Vault: convex-oeth - able to deposit 998.767475973270029453 OETHCRV-f
  */
  // predeposit to vaults
  await depositToVault(farmer, config.CURVE_USD_USDC_TOKEN, convexCrvUSDUSDVault, '100000');
  await depositToVault(farmer, config.CURVE_CVX_CRV_TOKEN, convexCVXCRVVault, '200000');
  await depositToVault(farmer, config.WETH_TOKEN, compoundVault, '5000');
  await depositToVault(farmer, config.CURVE_3CRV_TOKEN, convex3CRVVault, '100000');
  await depositToVault(farmer, config.USDT_TOKEN, idleUSDTVault, '100000');
  await depositToVault(farmer, config.SUSHI_LP_TOKEN, yelWETHVault, '70000');
  await depositToVault(farmer, config.DAI_TOKEN, idleDAIVault, '100000');
  await depositToVault(farmer, config.CURVE_STETH_TOKEN, convexSTETHVault, '200');
  await depositToVault(farmer, config.CURVE_OETH_TOKEN, convexOETHVault, '200');
  await depositToVault(farmer, config.USDC_TOKEN, idleUSDCVault, '100000');

  exit(0);
}

main().catch(console.error);
