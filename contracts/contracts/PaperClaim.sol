// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @notice Merkle claim contract with partial claims.
/// Leaf: keccak256(abi.encodePacked(account, totalAllocation))
contract PaperClaim is Ownable {
    IERC20 public immutable token;
    bytes32 public merkleRoot;

    mapping(address => uint256) public claimed;

    event MerkleRootUpdated(bytes32 merkleRoot);
    event Claimed(address indexed account, uint256 amount, uint256 claimedTotal);

    constructor(address token_, bytes32 merkleRoot_, address owner_) Ownable(owner_) {
        token = IERC20(token_);
        merkleRoot = merkleRoot_;
    }

    function setMerkleRoot(bytes32 newRoot) external onlyOwner {
        merkleRoot = newRoot;
        emit MerkleRootUpdated(newRoot);
    }

    function claim(uint256 totalAllocation, uint256 amountToClaim, bytes32[] calldata proof) external {
        require(amountToClaim > 0, "amount=0");

        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, totalAllocation));
        require(MerkleProof.verify(proof, merkleRoot, leaf), "bad_proof");

        uint256 already = claimed[msg.sender];
        require(already + amountToClaim <= totalAllocation, "exceeds_allocation");

        claimed[msg.sender] = already + amountToClaim;
        require(token.transfer(msg.sender, amountToClaim), "transfer_failed");

        emit Claimed(msg.sender, amountToClaim, claimed[msg.sender]);
    }
}
