import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import helpers from "@nomicfoundation/hardhat-network-helpers";
import hre from "hardhat";
import {
  CompoundStrategyMainnet_WETH,
  CompoundStrategyMainnet_WETH__factory,
  Controller,
  IERC20,
  IERC20__factory,
  VaultV1,
  VaultV2__factory,
} from "../../typechain-types";
import { BigNumberish } from "ethers";
import { depositToVault, setUpCoreProtocol } from "../utilities/hardhat-utils";
import { liquidations } from "../liquidation";

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
      let farmerOldBalance = await underlying.balanceOf(farmer1.address);
      await depositToVault(farmer1, underlying, vault, farmerBalance);
      let fTokenBalance = await vault.balanceOf(farmer1.address);

      const hours = 10n;
      const blocksPerHour = 2400n;
      let oldSharePrice;
      let newSharePrice;
      for (let i = 0n; i < hours; i++) {
        console.log("loop ", i);

        oldSharePrice = await vault.getPricePerFullShare();
        await controller.connect(governance).doHardWork(vault.target);
        newSharePrice = await vault.getPricePerFullShare();

        console.log("old shareprice: ", ethers.formatEther(oldSharePrice));
        console.log("new shareprice: ", ethers.formatEther(newSharePrice));
        console.log("growth: ", newSharePrice / oldSharePrice);

        const apr =
          (newSharePrice / oldSharePrice - 1n) *
          (24n / (blocksPerHour / 300n)) *
          365n;
        const apy =
          ((newSharePrice / oldSharePrice - 1n) *
            (24n / (blocksPerHour / 300n)) +
            1n) **
          365n;

        console.log("instant APR:", apr * 100n, "%");
        console.log("instant APY:", (apy - 1n) * 100n, "%");
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
      let farmerNewBalance = await underlying.balanceOf(farmer1);

      const apr =
        (farmerNewBalance / farmerOldBalance - 1n) *
        (24n / ((blocksPerHour * hours) / 300n)) *
        365n;
      const apy =
        ((farmerNewBalance / farmerOldBalance - 1n) *
          (24n / ((blocksPerHour * hours) / 300n)) +
          1n) **
        365n;

      console.log("earned!");
      console.log("Overall APR:", apr * 100n, "%");
      console.log("Overall APY:", (apy - 1n) * 100n, "%");

      await strategy.withdrawAllToVault({ from: governance }); // making sure can withdraw all for a next switch
    });
  });
});
