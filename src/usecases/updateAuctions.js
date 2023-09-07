const nosftCoreService = require("../services/nosftCoreService");
const { Auction } = require("../database/models");

const updateAuctions = async (inscription) => {
  const { inscriptionId } = inscription;
  try {
    // Retrieve the auctions from the nosftCoreService
    let auctions = await nosftCoreService.listAuctionInscriptions(
      inscriptionId
    );

    // Check for only relevant auctions
    auctions = auctions.filter(
      (auction) => auction.output === inscription.output
    );

    // Save the auctions into the database
    await Auction.bulkCreate(auctions, {
      updateOnDuplicate: [
        "initialPrice",
        "inscriptionId",
        "collection",
        "status",
        "decreaseAmount",
        "btcAddress",
        "currentPrice",
        "startTime",
        "scheduledISODate",
        "output",
        "reservePrice",
        "secondsBetweenEachDecrease",
        "metadata",
      ],
    });

    return auctions;
  } catch (err) {
    console.error(err);
  }
};

module.exports = updateAuctions;
