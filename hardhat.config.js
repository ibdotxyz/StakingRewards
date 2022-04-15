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
      ftm: '0xA5fC0BbfcD05827ed582869b7254b6f141BA84Eb',
    },
  },
  networks: {
    ftm: {
      url: 'https://rpc.ftm.tools/',
      accounts:
        process.env.DEPLOY_PRIVATE_KEY == undefined ? [] : [`0x${process.env.DEPLOY_PRIVATE_KEY}`]
    },
  }
};
