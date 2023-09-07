const { Collection, Inscription } = require("../database/models");
const getInscription = require("./getInscription");

const getCollectionInscriptions = async (slug) => {
  // Get the collection
  const collection = await Collection.findOne({
    where: { slug },
  });

  if (!collection?.id) {
    console.log(`No collection found with slug: ${slug}`);
    return null;
  }

  // Get all the related inscriptions
  const inscriptions = await Inscription.findAll({
    where: { collection_id: collection.id },
  });

  // Get all the inscription data
  const inscriptionData = await Promise.all(
    inscriptions.map((inscription) =>
      getInscription(inscription.inscriptionId)
    )
  );

  return inscriptionData;
};

module.exports = getCollectionInscriptions;
