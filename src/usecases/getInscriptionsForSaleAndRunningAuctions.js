const getRunningAuctions = require("./getRunningAuctions");
const getInscriptionsForSale = require("./getInscriptionsForSale");

const getInscriptionsForSaleAndRunningAuctions = async () => {
  try {
    // Get all inscriptions for sale and running auctions in parallel
    const [inscriptionsForSale, runningAuctions] = await Promise.all([
      getInscriptionsForSale(),
      getRunningAuctions(),
    ]);

    return {
      forSale: inscriptionsForSale,
      onAuction: runningAuctions,
    };
  } catch (err) {
    console.error(err);
  }
};

module.exports = getInscriptionsForSaleAndRunningAuctions;
