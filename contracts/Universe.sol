// SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";


import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./Diamonds.sol";

import "hardhat/console.sol";


contract Universe is ERC721, ERC721URIStorage, AccessControl {

    enum MintType { MINT, FORCLOSURE, MINT_DIAMONDS }


    Diamonds private _diamonds;


    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    string private _contractURI;
    string private _ipfsCid;

    function getDiamondAddress() public view returns (address) { 
        return address(_diamonds); 
    } 

    function getIpfsCid() public view returns (string memory) { 
        return _ipfsCid; 
    } 

    constructor(address defaultAdmin, address minter, string memory ipfsCid)  ERC721("Ethereum Baseball League", "EBL") {

        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(MINTER_ROLE, minter);

        _ipfsCid = ipfsCid;

        _contractURI = string(abi.encodePacked("ipfs://", _ipfsCid, "/contractMetadata.json"));


        //Deploy Diamonds
        _diamonds = new Diamonds(address(this), defaultAdmin, minter); 

    }

    function mint(address to, uint256 tokenId, uint256 cost, uint256 expires, uint8 v, bytes32 r, bytes32 s) public payable {

        require(to == _msgSender(), "Wrong wallet.");
        require(_ownerOf(tokenId) == address(0), "Token is already owned.");

        bytes32 payloadHash = keccak256(abi.encode(tokenId, cost, expires, to, MintType.MINT));        
        bytes32 messageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", payloadHash));
        address recovered = ECDSA.recover(messageHash, v, r, s );

        require(hasRole(MINTER_ROLE, recovered), "Must be signed by minter");
        require(msg.value == cost, "Send exact ETH");
        require(block.timestamp <= expires, "Expired.");

        //Mint
        _safeMint(to, tokenId);

    }

    function tokenURI(uint256 tokenId) public view virtual override(ERC721, ERC721URIStorage) returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ERC721Metadata: URI query for nonexistent token");
        return string(abi.encodePacked("ipfs://", _ipfsCid, "/metadata/", Strings.toString(tokenId), ".json"));
    }

    function contractURI() public view returns (string memory) {
        return _contractURI;
    }

    function update(string memory ipfsCid) public onlyRole(MINTER_ROLE) {

        _ipfsCid = ipfsCid;

        _contractURI = string(abi.encodePacked("ipfs://", _ipfsCid, "/contractMetadata.json"));

        emit BatchMetadataUpdate(0, type(uint256).max);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage, AccessControl) returns (bool)  {
        return super.supportsInterface(interfaceId);
    }

    function withdraw() public payable onlyRole(DEFAULT_ADMIN_ROLE) {

        (bool success, ) = payable(msg.sender).call{value: address(this).balance}("");
        require(success);

    }



}
