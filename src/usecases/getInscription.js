const { Inscription, Collection, Auction, Bid, Nostr } = require('../database/models');
const refreshInscription = require('./refreshInscription'); // Import the function, adjust the path according to your project structure

const getInscription = async (inscriptionId) => {
  try {
    // Get the inscription
    const inscription = await Inscription.findOne({
      where: { inscriptionId },
    });

    if (!inscription) {
      console.log(`No inscription found with id: ${inscriptionId}`);
      const newInscription = await refreshInscription(inscriptionId); // Refresh the inscription data
      if (!newInscription) {
        console.log(`Failed to refresh inscription with id: ${inscriptionId}`);
        throw new Error('Inscription not found');
      }

      return newInscription;
    }

    // Get the collection
    const collection = inscription.collection_id
      ? await Collection.findOne({
          where: { id: inscription.collection_id },
        })
      : null;

    // Get the auctions
    const auctions = await Auction.findAll({
      where: { inscription_id: inscription.id },
    });

    // Get the bids
    // Get the bids
    const bids = await Bid.findAll({
      where: { inscription_id: inscription.id },
      include: [
        {
          model: Nostr,
          as: 'nostr', // assuming 'nostrs' is the association alias you've set in your models
          required: false, // change to true if you want only bids that have a nostr
        },
      ],
    });

    // Get the sell events
    const sellEvents = await Nostr.findAll({
      where: { inscription_id: inscription.id, type: 'sell' },
    });

    // console.timeEnd("inscription");

    // Return the inscription, collection, auctions, bids, and sell events
    return { inscription, collection, auctions, bids, sellEvents };
  } catch (err) {
    console.error(err);
  }
};

module.exports = getInscription;
