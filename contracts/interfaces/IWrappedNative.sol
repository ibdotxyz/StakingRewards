// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
interface IWrappedNative {
    function deposit() payable external;
    function withdraw(uint wad) external;
}