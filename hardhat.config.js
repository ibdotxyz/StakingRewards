/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
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
  }
};
