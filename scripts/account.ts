import hre from "hardhat";
import { ERC20__factory, IERC20__factory } from "../typechain-types";
import config from "./fork-mainnet-config";

const ethers = hre.ethers;

export async function giveFarmerDepositTokenFromWhale(
  farmerAddress: string,
  tokenAddress: string,
  whaleAddress: string
): Promise<void> {
  try {
    const whale = await ethers.getImpersonatedSigner(whaleAddress);
    await (
      await ethers.getSigners()
    )[10].sendTransaction({
      to: whaleAddress,
      value: ethers.parseEther("1"),
    });
    const token = ERC20__factory.connect(tokenAddress, whale);
    const balance = await token.balanceOf(whaleAddress);

    await token.connect(whale).transfer(farmerAddress, balance);
  } catch (error) {
    console.log({ token: tokenAddress, error });
  }
}

export const prepareAccount = async () => {
  try {
    // prepare accounts
    const signer = await ethers.getSigners();
    const governance = signer[0];
    const farmer = signer[1];

    // prepare whale account
    await giveFarmerDepositTokenFromWhale(
      farmer.address,
      config.SUSHI_LP_TOKEN,
      config.SUSHI_LP_WHALE
    );
    await giveFarmerDepositTokenFromWhale(
      farmer.address,
      config.USDT_TOKEN,
      config.USDT_WHALE
    );
    await giveFarmerDepositTokenFromWhale(
      farmer.address,
      config.USDC_TOKEN,
      config.USDC_WHALE
    );
    await giveFarmerDepositTokenFromWhale(
      farmer.address,
      config.DAI_TOKEN,
      config.DAI_WHALE
    );
    await giveFarmerDepositTokenFromWhale(
      farmer.address,
      config.CURVE_STETH_TOKEN,
      config.CURVE_STETH_WHALE
    );
    await giveFarmerDepositTokenFromWhale(
      farmer.address,
      config.CURVE_OETH_TOKEN,
      config.CURVE_OETH_WHALE
    );
    await giveFarmerDepositTokenFromWhale(
      farmer.address,
      config.CURVE_CVX_CRV_TOKEN,
      config.CURVE_CVX_CRV_WHALE
    );
    await giveFarmerDepositTokenFromWhale(
      farmer.address,
      config.CURVE_CVX_ETH_TOKEN,
      config.CURVE_CVX_ETH_WHALE
    );
    await giveFarmerDepositTokenFromWhale(
      farmer.address,
      config.CURVE_USD_USDC_TOKEN,
      config.CURVE_USD_USDC_WHALE
    );
    await giveFarmerDepositTokenFromWhale(
      farmer.address,
      config.CURVE_3CRV_TOKEN,
      config.CURVE_3CRV_WHALE
    );
    await giveFarmerDepositTokenFromWhale(
      farmer.address,
      config.WETH_TOKEN,
      config.WETH_WHALE
    );

    return {
      governance,
      farmer,
    };
  } catch (error) {
    console.log({ error });
    throw error;
  }
};
