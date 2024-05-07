import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

import keys from './dev-keys.json';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      }
    ]
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: keys.mnemonic,
      },
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/" + keys.alchemyKeyMainnet,
        blockNumber: 13984950, 
      },
    },
  }
};

export default config;
