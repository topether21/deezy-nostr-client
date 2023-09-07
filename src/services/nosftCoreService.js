require('websocket-polyfill');
const nosftCore = require('nosft-core');

// Create an object with the exported module constants
const localConfig = {};

const nosft = nosftCore.Nosft({ ...localConfig });
const { getInscription } = nosft.inscriptions;
const { listAuctionInscriptions } = nosft.auction;
const { getNostrBid, getLatestSellNostrInscription } = nosft.nostr;
const { isSpent } = nosft.utxo; // Add isSpent from nosft.utxo

module.exports = {
  getInscription,
  listAuctionInscriptions,
  getNostrBid,
  getLatestSellNostrInscription,
  isSpent,
};
