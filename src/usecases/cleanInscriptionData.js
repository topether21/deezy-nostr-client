const { Auction, Bid, Nostr } = require("../database/models");

const cleanInscriptionData = async (inscriptionId) => {
  // Delete all the auctions, bids, and sell events for that inscriptionId
  await Promise.all([
    Auction.destroy({ where: { inscriptionId } }),
    Bid.destroy({ where: { inscriptionId } }),
    Nostr.destroy({ where: { inscriptionId } }),
  ]);
};

module.exports = cleanInscriptionData;
