const nosftCoreService = require("../services/nosftCoreService");
const { Nostr } = require("../database/models");

const updateSellEvent = async (inscription) => {
  try {
    const { inscriptionId, output } = inscription;
    // Retrieve the latest nostr event from the nosftCoreService
    let nostrEvent = await nosftCoreService.getLatestSellNostrInscription({ inscriptionId, output });

    if (!nostrEvent) {
      return;
    }

    // Delete any existing sell events for the given inscription
    await Nostr.destroy({ where: { inscriptionId, type: "sell" } });

    // Save the nostr event into the database using Nostr.findOrCreateFromProps
    const nostr = await Nostr.findOrCreateFromProps(nostrEvent, inscription.id);

    return nostr;
  } catch (err) {
    console.error(err);
  }
};

module.exports = updateSellEvent;
