const { Auction } = require("../database/models");
const { Op } = require("sequelize");
const getInscription = require("./getInscription");

const getRunningAuctions = async () => {
  try {
    // Get all the auctions with status 'RUNNING'
    const auctions = await Auction.findAll({
      where: { status: { [Op.ne]: "FINISHED" } },
    });

    // Get all the related inscriptions
    const inscriptions = await Promise.all(
      auctions.map((auction) => getInscription(auction.inscriptionId))
    );

    return inscriptions || [];
  } catch (err) {
    console.error(err);
    throw err;
  }

  return []
};

module.exports = getRunningAuctions;
