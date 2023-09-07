const { Nostr } = require("../database/models");
const getInscription = require("./getInscription");

const getInscriptionsForSale = async () => {
  try {
    // Get all Nostr events of type 'sell'
    const sellEvents = await Nostr.findAll({
      where: { item_type: "sell" },
    });

    // Get all the inscription data
    const inscriptions = await Promise.all(
      sellEvents.map((event) => getInscription(event.inscriptionId))
    );

    return inscriptions;
  } catch (err) {
    console.error(err);
  }
};

module.exports = getInscriptionsForSale;
