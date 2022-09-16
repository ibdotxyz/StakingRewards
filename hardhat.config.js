/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
require('hardhat-deploy');
require('./tasks/deploy-staking-reward');
require('dotenv').config();

module.exports = {
  solidity: {
    version: "0.8.12" ,
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  namedAccounts: {
    deployer: 0,
    multisig: {
      avalanche: '0xf3472A93B94A17dC20F9Dc9D0D48De42FfbD14f4',
    },
    wrappedNative: {
      avalanche: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
    }
  },
  networks: {
    avalanche: {
      url: 'https://api.avax.network/ext/bc/C/rpc',
      chainId: 43114,
      accounts: [`0x${process.env.DEPLOY_PRIVATE_KEY ?? ''}`]
    },
  }
};
