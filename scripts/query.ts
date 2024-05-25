import { ethers } from "hardhat";
import { VAULT_LIST } from "./fork-mainnet-config";
import { VaultV1__factory } from "../typechain-types";
import { TokenBalance, getUnderlyingTokenBalance } from "./helpers";

async function main() {
  const signer = await ethers.getSigners();

  const governance = signer[0];

  const farmer = signer[1];

  VAULT_LIST.forEach(async (vault) => {
    const vaultContract = VaultV1__factory.connect(vault.vault, governance);
    const underlying = await vaultContract.underlying();
    const balance: TokenBalance = await getUnderlyingTokenBalance(underlying, farmer.address);
    console.log(`Vault: ${vault.name} - able to deposit ${balance.balance} ${balance.symbol}`);
  });
}

main().catch(console.error);
