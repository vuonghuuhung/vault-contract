import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import helpers from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";
import {
  CompoundStrategyMainnet_WETH,
  CompoundStrategyMainnet_WETH__factory,
  Controller,
  ConvexStrategyMainnet_3CRV,
  ConvexStrategyMainnet_3CRV__factory,
  ConvexStrategyMainnet_OETH,
  ConvexStrategyMainnet_OETH__factory,
  IBooster__factory,
  IERC20,
  IERC20__factory,
  IdleStrategyMainnet_DAI,
  IdleStrategyMainnet_DAI__factory,
  VaultV1,
  VaultV2__factory,
} from "../../typechain-types";
import { BigNumberish } from "ethers";
import { depositToVault, setUpCoreProtocol } from "../utilities/hardhat-utils";
import { liquidations } from "../liquidation";
import { BigDecimal } from "../../lib/bignumber";

const ethers = hre.ethers;

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const CRV = "0xD533a949740bb3306d119CC777fa900bA034cd52";
const CVX = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const WHALE = "0x69e078EBc4631E1947F0c38Ef0357De7ED064644";
const FARM = "0xa0246c9032bC3A600820415aE600c6388619A14D";
const IFARM = "0x1571eD0bed4D987fe2b498DdBaE7DFA19519F651";
const UNDERLYING = "0x94B17476A93b3262d87B9a326965D1E91f9c13E7";

describe("Mainnet Convex OETH", () => {
  let accounts: HardhatEthersSigner[];

  let underlying: IERC20;

  let underlyingWhale: HardhatEthersSigner;
  let crv: IERC20;
  let cvx: IERC20;
  let usdc: IERC20
  let weth: IERC20;

  let governance: HardhatEthersSigner;
  let farmer1: HardhatEthersSigner;

  let farmerBalance: BigNumberish;

  let controller: Controller;
  let vault: VaultV1;
  let strategy: ConvexStrategyMainnet_OETH;

  const setupExternalContracts = async () => {
    underlying = IERC20__factory.connect(UNDERLYING, accounts[10]);
    weth = IERC20__factory.connect(WETH, accounts[10]);
    crv = IERC20__factory.connect(CRV, accounts[10]);
    cvx = IERC20__factory.connect(CVX, accounts[10]);
    usdc = IERC20__factory.connect(USDC, accounts[10]);
  };

  const setupBalance = async () => {
    underlyingWhale = await ethers.getImpersonatedSigner(WHALE);
    await accounts[8].sendTransaction({
      to: WHALE,
      value: ethers.parseEther("100"),
    });
    farmerBalance = await underlying.balanceOf(underlyingWhale.address);
    await underlying
      .connect(underlyingWhale)
      .transfer(farmer1.address, farmerBalance);
  };

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    governance = accounts[0];
    farmer1 = accounts[1];

    await setupExternalContracts();
    await setupBalance();

    const vaultImplementation = await new VaultV2__factory(governance).deploy();

    const strategyImplementation =
      await new ConvexStrategyMainnet_OETH__factory(governance).deploy();
    
    const {
      controller: controllerContract,
      vault: vaultContract,
      strategy: strategyContract,
    } = await setUpCoreProtocol(
      {
        vaultImplementation: vaultImplementation.target,
        underlyingAddress: UNDERLYING,
        FARMToken: FARM,
        IFARMToken: IFARM,
        WETHToken: WETH,
        liquidation: liquidations,
        strategyImplementation: strategyImplementation.target,
        strategyType: "convex-oeth",
      },
      governance
    );
    controller = controllerContract;
    vault = vaultContract;
    strategy = strategyContract as ConvexStrategyMainnet_OETH;
  });

  describe("Happy path", () => {
    it("Farmer should earn money", async () => {
      let farmerOldBalance = new BigDecimal(ethers.formatEther(await underlying.balanceOf(farmer1.address)));
      await depositToVault(farmer1, underlying, vault, farmerBalance);
      let fTokenBalance = await vault.balanceOf(farmer1.address);

      const hours = 10;
      const blocksPerHour = 2400;
      let oldSharePrice;
      let newSharePrice;
      for (let i = 0; i < hours; i++) {
        console.log("loop ", i);

        oldSharePrice = new BigDecimal(ethers.formatEther(await vault.getPricePerFullShare()));
        await controller.connect(governance).doHardWork(vault.target);
        newSharePrice = new BigDecimal(ethers.formatEther(await vault.getPricePerFullShare()));

        console.log("old shareprice: ", oldSharePrice.toNumber());
        console.log("new shareprice: ", newSharePrice.toNumber());
        console.log("growth: ", newSharePrice.div(oldSharePrice).toNumber());

        const apr = (newSharePrice.div(oldSharePrice).sub(1)).mul(24 / (blocksPerHour / 300)).mul(365);
        const apy = ((newSharePrice.div(oldSharePrice).sub(1)).mul(24 / (blocksPerHour / 300)).add(1)).pow(365);

        console.log("instant APR:", apr.mul(100).toNumber() > 0 ? apr.mul(100).toNumber() : 0, "%");
        console.log("instant APY:", (apy.sub(1)).mul(100).toNumber() > 0 ? (apy.sub(1)).mul(100).toNumber() : 0, "%");
        await vault.connect(farmer1).withdraw(fTokenBalance / 10n);
        await depositToVault(
          farmer1,
          underlying,
          vault,
          await underlying.balanceOf(farmer1)
        );
        await hre.network.provider.send("hardhat_mine", ["0x100"]);
      }
      fTokenBalance = await vault.balanceOf(farmer1);
      await vault.connect(farmer1).withdraw(fTokenBalance);
      let farmerNewBalance = new BigDecimal(ethers.formatEther(await underlying.balanceOf(farmer1)));
      const apr = (farmerNewBalance.div(farmerOldBalance).sub(1)).mul(24 / ((blocksPerHour * hours) / 300)).mul(365);
      const apy = ((farmerNewBalance.div(farmerOldBalance).sub(1)).mul(24 / ((blocksPerHour * hours) / 300)).add(1)).pow(365);

      console.log("earned!");
      console.log("Overall APR:", apr.mul(100).toNumber(), "%");
      console.log("Overall APY:", (apy.sub(1)).mul(100).toNumber(), "%");

      await strategy.withdrawAllToVault({ from: governance }); // making sure can withdraw all for a next switch
    });
  });
});
