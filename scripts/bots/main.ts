// Bot auto sending token to idle usdc vault to make fake profit
import { ethers } from "hardhat";
import { ERC20__factory, VaultV1__factory } from "../../typechain-types";

async function main() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const idleWhale = await ethers.getImpersonatedSigner(
      "0x4A1696CAff77d8e85B3291562bc713bA9bCa7c22"
    );
    const vault = VaultV1__factory.connect("0x486BAabd11C7b6C0a2B98362534aA53B46AaadCD", idleWhale);
    const strategy = await vault.strategy();
    const idle = ERC20__factory.connect(
      "0xF34842d05A1c888Ca02769A633DF37177415C2f8",
      idleWhale
    );
    console.log({ balance: await idle.balanceOf(idleWhale.address) });
    const tx = await idle.transfer(strategy, ethers.parseUnits("3", 18));
    await tx.wait();
    console.log({ balance: await idle.balanceOf(idleWhale.address) });
    // sleep 3 second
    await new Promise((r) => setTimeout(r, 3000));
  }
}

main().catch(console.error);
