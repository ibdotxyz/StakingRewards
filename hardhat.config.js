/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
require('hardhat-deploy');
require('./tasks/deploy-staking-reward');

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
    multisig: {
      hardhat: '0x197939c1ca20C2b506d6811d8B6CDB3394471074',
      mainnet: '0xA5fC0BbfcD05827ed582869b7254b6f141BA84Eb',
    },
  },
  networks: {
    ftm: {
      url: 'https://rpc.ftm.tools',
    }
  }
};
