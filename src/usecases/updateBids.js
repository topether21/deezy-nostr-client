const nosftCoreService = require("../services/nosftCoreService");
const { Bid, Nostr } = require("../database/models");

const updateBids = async (inscription) => {
  const { inscriptionId } = inscription;
  try {
    // Retrieve the bids from the nosftCoreService
    let bids = await nosftCoreService.getNostrBid(inscription);

    bids = await Promise.all(
      bids.map(async (bid) => {
        const { price, bidOwner, nostr, output, created_at, ordinalOwner } = bid;

        // Save the nostr attribute using Nostr.findOrCreateFromProps
        const nostrInstance = await Nostr.findOrCreateFromProps(
          nostr
        );

        // Assign the nostrId back to the bid
        return {
          id: nostrInstance.id,
          price,
          bidOwner,
          ordinalOwner,
          nostrId: nostrInstance.id,
          output,
          bidCreatedAt: created_at,
          inscriptionId
        };
      })
    );

    // Use bulkCreate to insert or update records
    const createdBids = await Bid.bulkCreate(bids, {
      updateOnDuplicate: [
        "price",
        "bidOwner",
        "nostr",
        "output",
        "bidCreatedAt",
        "ordinalOwner",
        "nostrId",
        "inscriptionId"
      ],
    });

    return createdBids;
  } catch (err) {
    console.error(err);
  }
};

module.exports = updateBids;
