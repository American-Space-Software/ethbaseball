// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "hardhat/console.sol";
import "./Universe.sol";

contract Diamonds is ERC20, AccessControl,ERC20Burnable, ERC20Permit {

    uint constant public MINT_TYPE_WITHDRAW = 3;//3 is just continuing the MintType enum from Universe   
    uint constant public MINT_TYPE_DIAMONDS = 4; 

    Universe private _universe;

    event DepositToTeam(address from, uint256 amount);
    event MintReward(address to, uint256 mintPassId, uint256 amount);

    mapping(uint256 => bool) public mintPasses;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address universeAddress, address defaultAdmin, address minter) ERC20("Diamonds", "DIAMOND") ERC20Permit("Diamonds") {

        _universe = Universe(universeAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, minter);

    }
    
    function mint(address to, uint256 mintPassId, uint256 amount, uint256 expires, uint8 v, bytes32 r, bytes32 s) public {

        require(to == _msgSender(), "Wrong wallet.");
        require(mintPasses[mintPassId] == false, "Mint pass already used.");

        bytes32 payloadHash = keccak256(abi.encode(mintPassId, amount, expires, to, MINT_TYPE_DIAMONDS));     
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        address recovered = ECDSA.recover(messageHash, v, r, s );

        require(hasRole(MINTER_ROLE, recovered), "Must be signed by minter");
        require(block.timestamp <= expires, "Expired.");

        mintPasses[mintPassId] = true;
        
        emit MintReward(to, mintPassId, amount);

        //Mint
        _mint(to, amount);

    }


    function deposit(address from, uint256 amount) public {
        emit DepositToTeam(from, amount);
        _burn(from, amount);
    }


}