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
import { setUpCoreProtocol } from "../utilities/hardhat-utils";

const ethers = hre.ethers;

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const COMP = "0xc00e94Cb662C3520282E6f5717214004A7f26888";
const WHALE = "0xc765faECA19B33483f2A105e7B02e309393A45B0";
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
    underlying = IERC20__factory.connect(WETH);
    weth = IERC20__factory.connect(WETH);
    comp = IERC20__factory.connect(COMP);
  };

  const setupBalance = async () => {
    underlyingWhale = await ethers.getImpersonatedSigner(WHALE);
    await helpers.setBalance(underlyingWhale.address, 100n ** 18n);
    farmerBalance = await underlying.balanceOf(underlyingWhale.address);
    await underlying.connect(underlyingWhale).transfer(farmer1.address, farmerBalance);
  };

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    governance = accounts[0];
    farmer1 = accounts[1];
    
    await setupExternalContracts();
    await setupBalance();

    const vaultImplementation = await new VaultV2__factory(governance).deploy();

    const strategyImplementation = await new CompoundStrategyMainnet_WETH__factory(governance).deploy();

    const { controller: controllerContract, vault: vaultContract, strategyProxy: strategyContract } = await setUpCoreProtocol({
        vaultImplementation: vaultImplementation.target,
        underlyingAddress: WETH,
        FARMToken: FARM,
        IFARMToken: IFARM,
        WETHToken: WETH,
        liquidation: [{"uniV3": [WETH, COMP]}],
        strategyImplementation: strategyImplementation.target,

    }, governance);
    controller = controllerContract;
    vault = vaultContract;
    strategy = strategyContract as any;
  });

  describe("Happy path", () => {
    it("Farmer should earn money", async () => {
        let farmerOldBalance = await underlying.balanceOf(farmer1.address);
    });
  });
});
