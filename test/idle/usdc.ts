import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import hre from "hardhat";
import {
  Controller,
  IERC20,
  IERC20__factory,
  IdleStrategyMainnet_USDC,
  IdleStrategyMainnet_USDC__factory,
  VaultV1,
  VaultV2__factory,
} from "../../typechain-types";
import { BigNumberish } from "ethers";
import { depositToVault, setUpCoreProtocol } from "../utilities/hardhat-utils";
import { liquidations } from "../liquidation";
import { BigDecimal } from "../../lib/bignumber";

const ethers = hre.ethers;

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const IDLE = "0x3fE7940616e5Bc47b0775a0dccf6237893353bB4";
const WHALE = "0x4B16c5dE96EB2117bBE5fd171E4d203624B014aa";
const FARM = "0xa0246c9032bC3A600820415aE600c6388619A14D";
const IFARM = "0x1571eD0bed4D987fe2b498DdBaE7DFA19519F651";

describe("Mainnet Idle USDC", () => {
  let accounts: HardhatEthersSigner[];

  let underlying: IERC20;

  let underlyingWhale: HardhatEthersSigner;
  let usdc: IERC20;
  let idle: IERC20;
  let weth: IERC20;

  let governance: HardhatEthersSigner;
  let farmer1: HardhatEthersSigner;

  let farmerBalance: BigNumberish;

  let controller: Controller;
  let vault: VaultV1;
  let strategy: IdleStrategyMainnet_USDC;

  const setupExternalContracts = async () => {
    underlying = IERC20__factory.connect(USDC, accounts[10]);
    weth = IERC20__factory.connect(WETH, accounts[10]);
    usdc = IERC20__factory.connect(USDC, accounts[10]);
    idle = IERC20__factory.connect(IDLE, accounts[10]);
  };

  const setupBalance = async () => {
    underlyingWhale = await ethers.getImpersonatedSigner(WHALE);
    await accounts[8].sendTransaction({
      to: WHALE,
      value: ethers.parseEther("100"),
    });
    farmerBalance = 1000000n * 10n ** 6n;
    await underlying
      .connect(underlyingWhale)
      .transfer(farmer1.address, 1000000n * 10n ** 6n);
  };

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    governance = accounts[0];
    farmer1 = accounts[1];

    await setupExternalContracts();
    await setupBalance();

    const vaultImplementation = await new VaultV2__factory(governance).deploy();

    const strategyImplementation =
      await new IdleStrategyMainnet_USDC__factory(governance).deploy();

    const {
      controller: controllerContract,
      vault: vaultContract,
      strategy: strategyContract,
    } = await setUpCoreProtocol(
      {
        vaultImplementation: vaultImplementation.target,
        underlyingAddress: USDC,
        FARMToken: FARM,
        IFARMToken: IFARM,
        WETHToken: WETH,
        liquidation: liquidations,
        strategyImplementation: strategyImplementation.target,
        strategyType: "idle-usdc",
      },
      governance
    );
    controller = controllerContract;
    vault = vaultContract;
    strategy = strategyContract as IdleStrategyMainnet_USDC;
  });

  describe("Happy path", () => {
    it("Farmer should earn money", async () => {
      let farmerOldBalance = new BigDecimal(ethers.formatUnits(await underlying.balanceOf(farmer1.address), 6));
      await depositToVault(farmer1, underlying, vault, farmerBalance);
      let fTokenBalance = await vault.balanceOf(farmer1.address);

      const hours = 10;
      const blocksPerHour = 2400;
      let oldSharePrice;
      let newSharePrice;
      for (let i = 0; i < hours; i++) {
        console.log("loop ", i);

        oldSharePrice = new BigDecimal(ethers.formatUnits(await vault.getPricePerFullShare(), 6));
        await controller.connect(governance).doHardWork(vault.target);
        await usdc.connect(underlyingWhale).transfer(vault, 10n * 10n ** 6n);
        newSharePrice = new BigDecimal(ethers.formatUnits(await vault.getPricePerFullShare(), 6));

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
      let farmerNewBalance = new BigDecimal(ethers.formatUnits(await underlying.balanceOf(farmer1), 6));
      const apr = (farmerNewBalance.div(farmerOldBalance).sub(1)).mul(24 / ((blocksPerHour * hours) / 300)).mul(365);
      const apy = ((farmerNewBalance.div(farmerOldBalance).sub(1)).mul(24 / ((blocksPerHour * hours) / 300)).add(1)).pow(365);

      console.log("earned!");
      console.log("Overall APR:", apr.mul(100).toNumber(), "%");
      console.log("Overall APY:", (apy.sub(1)).mul(100).toNumber(), "%");

      await strategy.withdrawAllToVault({ from: governance }); // making sure can withdraw all for a next switch
    });
  });
});
