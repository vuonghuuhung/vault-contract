import hre from "hardhat";
import { ERC20__factory } from "../typechain-types";

const ethers = hre.ethers;

export type TokenBalance = {
  name: string;
  symbol: string;
  balance: string;
};

export const getUnderlyingTokenBalance = async (
  tokenAddress: string,
  accountAddress: string
): Promise<TokenBalance> => {
  const token = ERC20__factory.connect(tokenAddress, ethers.provider);
  const balance = await token.balanceOf(accountAddress);
  const decimals = await token.decimals();
  const symbol = await token.symbol();
  const name = await token.name();

  return {
    name,
    symbol,
    balance: ethers.formatUnits(balance, decimals),
  };
};
