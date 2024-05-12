import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-network-helpers";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "hardhat-tracer"
import "hardhat-ethernal";

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
        blockNumber: 19819900,
      },
    },
  },
  mocha: {
    timeout: 100000000,
  },
  // @ts-ignore
  ethernal: {
    apiToken: keys.ethernalApiKey,
    resetOnStart: "Hardhat Local Network",
    workspace: "Hardhat Local Network",
    disableSync: false,
    disableTrace: true,
    skipFirstBlock: false,
    verbose: true
  }
};

// export interface EthernalConfig {
//   disableSync: boolean;
//   disableTrace: boolean;
//   workspace?: string;
//   uploadAst: boolean;
//   disabled: boolean;
//   resetOnStart?: string;
//   email?: string;
//   password?: string;
//   serverSync?: boolean;
//   apiToken?: string;
//   skipFirstBlock?: boolean;
//   verbose?: boolean;
// }

export default config;
