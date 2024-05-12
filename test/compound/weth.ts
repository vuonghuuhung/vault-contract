import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import helpers from "@nomicfoundation/hardhat-network-helpers";
import hre, { config } from "hardhat";
import {
  CompoundStrategyMainnet_WETH,
  CompoundStrategyMainnet_WETH__factory,
  Controller,
  IERC20,
  IERC20__factory,
  VaultV1,
  VaultV2__factory,
} from "../../typechain-types";
import { BigNumberish, Mnemonic } from "ethers";
import { depositToVault, setUpCoreProtocol } from "../utilities/hardhat-utils";
import { liquidations } from "../liquidation";
import { BigDecimal } from "../../lib/bignumber";

const ethers = hre.ethers;

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const COMP = "0xc00e94Cb662C3520282E6f5717214004A7f26888";
const WHALE = "0x8EB8a3b98659Cce290402893d0123abb75E3ab28";
const FARM = "0xa0246c9032bC3A600820415aE600c6388619A14D";
const IFARM = "0x1571eD0bed4D987fe2b498DdBaE7DFA19519F651";

describe("Mainnet Compound WETH", () => {
  let accounts: HardhatEthersSigner[];

  let underlying: IERC20;

  let underlyingWhale: HardhatEthersSigner;
  let weth: IERC20;
  let comp: IERC20;

  let governance: HardhatEthersSigner;
  let farmer1: HardhatEthersSigner;

  let farmerBalance: BigNumberish;

  let controller: Controller;
  let vault: VaultV1;
  let strategy: CompoundStrategyMainnet_WETH;

  const setupExternalContracts = async () => {
    underlying = IERC20__factory.connect(WETH, accounts[10]);
    weth = IERC20__factory.connect(WETH, accounts[10]);
    comp = IERC20__factory.connect(COMP, accounts[10]);
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
      await new CompoundStrategyMainnet_WETH__factory(governance).deploy();

    const {
      controller: controllerContract,
      vault: vaultContract,
      strategy: strategyContract,
    } = await setUpCoreProtocol(
      {
        vaultImplementation: vaultImplementation.target,
        underlyingAddress: WETH,
        FARMToken: FARM,
        IFARMToken: IFARM,
        WETHToken: WETH,
        liquidation: liquidations,
        strategyImplementation: strategyImplementation.target,
        strategyType: "compound",
      },
      governance
    );
    controller = controllerContract;
    vault = vaultContract;
    strategy = strategyContract as CompoundStrategyMainnet_WETH;
  });

  describe("Happy path", () => {
    it("Farmer should earn money", async () => {
      let farmerOldBalance = new BigDecimal(
        ethers.formatEther(await underlying.balanceOf(farmer1.address))
      );
      await depositToVault(farmer1, underlying, vault, farmerBalance);
      let fTokenBalance = await vault.balanceOf(farmer1.address);

      const hours = 10;
      const blocksPerHour = 2400;
      let oldSharePrice;
      let newSharePrice;
      for (let i = 0; i < hours; i++) {
        console.log("loop ", i);

        oldSharePrice = new BigDecimal(
          ethers.formatEther(await vault.getPricePerFullShare())
        );
        await controller.connect(governance).doHardWork(vault.target);
        newSharePrice = new BigDecimal(
          ethers.formatEther(await vault.getPricePerFullShare())
        );

        console.log("old shareprice: ", oldSharePrice.toNumber());
        console.log("new shareprice: ", newSharePrice.toNumber());
        console.log("growth: ", newSharePrice.div(oldSharePrice).toNumber());

        const apr = newSharePrice
          .div(oldSharePrice)
          .sub(1)
          .mul(24 / (blocksPerHour / 300))
          .mul(365);
        const apy = newSharePrice
          .div(oldSharePrice)
          .sub(1)
          .mul(24 / (blocksPerHour / 300))
          .add(1)
          .pow(365);

        console.log(
          "instant APR:",
          apr.mul(100).toNumber() > 0 ? apr.mul(100).toNumber() : 0,
          "%"
        );
        console.log(
          "instant APY:",
          apy.sub(1).mul(100).toNumber() > 0
            ? apy.sub(1).mul(100).toNumber()
            : 0,
          "%"
        );
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
      let farmerNewBalance = new BigDecimal(
        ethers.formatEther(await underlying.balanceOf(farmer1))
      );
      const apr = farmerNewBalance
        .div(farmerOldBalance)
        .sub(1)
        .mul(24 / ((blocksPerHour * hours) / 300))
        .mul(365);
      const apy = farmerNewBalance
        .div(farmerOldBalance)
        .sub(1)
        .mul(24 / ((blocksPerHour * hours) / 300))
        .add(1)
        .pow(365);

      console.log("earned!");
      console.log("Overall APR:", apr.mul(100).toNumber(), "%");
      console.log("Overall APY:", apy.sub(1).mul(100).toNumber(), "%");

      await strategy.withdrawAllToVault({ from: governance }); // making sure can withdraw all for a next switch
    });
  });
});
