import { NewERC721Contract } from "../generated/DGLiveNFTFactory/DGLiveNFTFactory";
import { Transfer as TransferEvent } from "../generated/templates/NFTCollectionTemplate/DGLiveNFT";
import {
  NFT,
  NFTAddress,
  User,
  TransferEvent as TransferEntity,
} from "../generated/schema";
import { DataSourceTemplate, BigInt } from "@graphprotocol/graph-ts";
import { DGLiveNFT as DGLiveNFTContract } from "../generated/templates/NFTCollectionTemplate/DGLiveNFT";
import { OwnershipTransferred } from "../generated/templates/NFTCollectionTemplate/DGLiveNFT";

export function handleNewERC721Contract(event: NewERC721Contract): void {
  let nftAddress = new NFTAddress(event.params.contractAddress.toHexString());
  let user = User.load(event.params.owner.toHexString());

  if (user == null) {
    user = new User(event.params.owner.toHexString());
    user.save();
  }

  nftAddress.owner = user.id;
  nftAddress.collectionType = event.params.category;
  nftAddress.collectionName = event.params.name;
  nftAddress.collectionSymbol = event.params.symbol;
  nftAddress.createdAt = event.block.timestamp; // Set the timestamp
  nftAddress.save();

  // Dynamically add data source for the new NFT contract
  DataSourceTemplate.create("NFTCollectionTemplate", [
    event.params.contractAddress.toHexString(),
  ]);
}

export function handleTransfer(event: TransferEvent): void {
  let nftId = event.address
    .toHexString()
    .concat("-")
    .concat(event.params.tokenId.toString());

  let nft = NFT.load(nftId);

  if (nft == null) {
    nft = new NFT(nftId);
    nft.nftAddress = event.address.toHexString();
    // Assuming you have the tokenURI in the event, you would set it here.
    // Alternatively, you may need to make a call to the contract.
    let contract = DGLiveNFTContract.bind(event.address);
    let tokenURI = contract.tokenURI(event.params.tokenId);

    // Set the tokenURI
    nft.tokenURI = tokenURI;
    nft.save();
  }

  let fromUser = User.load(event.params.from.toHexString());
  if (fromUser == null) {
    fromUser = new User(event.params.from.toHexString());
    fromUser.save();
  }

  let toUser = User.load(event.params.to.toHexString());
  if (toUser == null) {
    toUser = new User(event.params.to.toHexString());
    toUser.save();
  }

  nft.owner = toUser.id;
  nft.save();

  let transferEventId = event.transaction.hash
    .toHexString()
    .concat("-")
    .concat(event.logIndex.toString());

  let transferEvent = new TransferEntity(transferEventId);
  transferEvent.nft = nft.id;
  transferEvent.from = fromUser.id;
  transferEvent.to = toUser.id;
  transferEvent.timestamp = event.block.timestamp;
  transferEvent.save();
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let nftAddress = NFTAddress.load(event.address.toHexString());

  if (nftAddress != null) {
    let newOwner = User.load(event.params.newOwner.toHexString());

    if (newOwner == null) {
      newOwner = new User(event.params.newOwner.toHexString());
      newOwner.save();
    }

    nftAddress.owner = newOwner.id;
    nftAddress.save();
  }
}
