import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import hre from "hardhat";
import {
  Controller,
  ERC20__factory,
  IERC20,
  IERC20__factory,
  IdleStrategyMainnet_USDT,
  IdleStrategyMainnet_USDT__factory,
  VaultV1,
  VaultV2__factory,
} from "../typechain-types";
import { BigNumberish } from "ethers";
import { depositToVault, setUpCoreProtocol } from "./utilities/hardhat-utils";
import { liquidations } from "./liquidation";

const ethers = hre.ethers;

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const WHALE = "0xF977814e90dA44bFA03b6295A0616a897441aceC";
const FARM = WETH;
const IFARM = "0x1571eD0bed4D987fe2b498DdBaE7DFA19519F651";

describe("Mainnet Idle USDT", () => {
  let accounts: HardhatEthersSigner[];

  let underlying: IERC20;

  let underlyingWhale: HardhatEthersSigner;

  let governance: HardhatEthersSigner;
  let farmer1: HardhatEthersSigner;

  let farmerBalance: BigNumberish;

  let controller: Controller;
  let vault: VaultV1;
  let strategy: IdleStrategyMainnet_USDT;

  const setupExternalContracts = async () => {
    underlying = IERC20__factory.connect(USDT, accounts[10]);
  };

  const setupBalance = async () => {
    underlyingWhale = await ethers.getImpersonatedSigner(WHALE);
    await accounts[8].sendTransaction({
      to: WHALE,
      value: ethers.parseEther("100"),
    });
    farmerBalance = 10000n * 10n ** 6n;
    await underlying
      .connect(underlyingWhale)
      .transfer(farmer1.address, 10000n * 10n ** 6n);
  };

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    governance = accounts[0];
    farmer1 = accounts[1];

    await setupExternalContracts();
    await setupBalance();

    const vaultImplementation = await new VaultV2__factory(governance).deploy();

    const strategyImplementation = await new IdleStrategyMainnet_USDT__factory(
      governance
    ).deploy();

    const {
      controller: controllerContract,
      vault: vaultContract,
      strategy: strategyContract,
    } = await setUpCoreProtocol(
      {
        vaultImplementation: vaultImplementation.target,
        underlyingAddress: USDT,
        FARMToken: FARM,
        IFARMToken: IFARM,
        WETHToken: WETH,
        liquidation: liquidations,
        strategyImplementation: strategyImplementation.target,
        strategyType: "idle-usdt",
      },
      governance
    );
    controller = controllerContract;
    vault = vaultContract;
    strategy = strategyContract as IdleStrategyMainnet_USDT;
  });

  describe("Happy path", () => {
    it("Farmer should earn money", async () => {
      await depositToVault(farmer1, underlying, vault, farmerBalance);
    //   await strategy.connect(governance).setProtected(false);
      const strategist = (await ethers.getSigners())[19]; 

      const weth = ERC20__factory.connect(WETH, governance);
      console.log({
        oldGovBalance: await weth.balanceOf(governance.address),
        oldStrategistBalance: await weth.balanceOf(strategist.address),
      });
      
      await controller.connect(governance).doHardWork(vault.target);
      const idleWhale = await ethers.getImpersonatedSigner("0x4A1696CAff77d8e85B3291562bc713bA9bCa7c22");
      const idle = ERC20__factory.connect('0xF34842d05A1c888Ca02769A633DF37177415C2f8', idleWhale);
      await idle.transfer(strategy.target, await idle.balanceOf(idleWhale.address));
      await controller.connect(governance).doHardWork(vault.target);
      console.log({ newSharePrice: await vault.getPricePerFullShare() });

      console.log({
        newGovBalance: await weth.balanceOf(governance.address),
        newStrategistBalance: await weth.balanceOf(strategist.address),
      });
    });
  });
});
