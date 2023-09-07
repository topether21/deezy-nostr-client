const updateInscription = require('./updateInscription');
const updateAuctions = require('./updateAuctions');
const updateBids = require('./updateBids');
const updateSellEvent = require('./updateSellEvent');
const nosftCoreService = require('../services/nosftCoreService');
const cleanInscriptionData = require('./cleanInscriptionData');

const refreshInscription = async (inscriptionId) => {
  try {
    // console.time("updateInscription");
    const result = await updateInscription(inscriptionId);
    // console.timeEnd("updateInscription");

    const { inscription, collection = null } = result;

    // console.time("isSpent");
    const { spent } = await nosftCoreService.isSpent(inscription);
    // console.timeEnd("isSpent");

    if (spent) {
      // console.time("cleanInscriptionData");
      await cleanInscriptionData(inscriptionId);
      // console.timeEnd("cleanInscriptionData");

      return {
        inscription,
        collection,
        auctions: [],
        bids: [],
        sellEvents: [],
      };
    }

    // console.time("updateAuctions");
    const updateAuctionsPromise = updateAuctions(inscription);
    // console.timeEnd("updateAuctions");

    // console.time("updateBids");
    const updateBidsPromise = updateBids(inscription);
    // console.timeEnd("updateBids");

    // console.time("updateSellEvent");
    const updateSellEventPromise = updateSellEvent(inscription);
    // console.timeEnd("updateSellEvent");

    // console.time("allSettled");
    const outcomes = await Promise.allSettled([updateAuctionsPromise, updateBidsPromise, updateSellEventPromise]);
    // console.timeEnd("allSettled");

    const auctions = outcomes[0].status === 'fulfilled' ? outcomes[0].value : [];
    const bids = outcomes[1].status === 'fulfilled' ? outcomes[1].value : [];
    const sellEvents = outcomes[2].status === 'fulfilled' ? outcomes[2].value : [];

    return { inscription, collection, auctions, bids, sellEvents };
  } catch (err) {
    console.error(err);
  }
};

module.exports = refreshInscription;
