const nosftCoreService = require("../services/nosftCoreService");
const { Collection, Inscription } = require("../database/models");

const createOrUpdateCollection = async (collectionData) => {
  if (!collectionData) {
    return;
  }

  // Destructure collectionData and map it to a new payload object
  const {
    slug,
    name,
    description,
    inscription_icon: inscriptionIcon,
    twitter_link: twitterLink,
    website_link: websiteLink,
    icon,
  } = collectionData;

  const payload = {
    slug,
    name,
    description,
    inscriptionIcon,
    twitterLink,
    websiteLink,
    icon,
  };

  // Check if a collection with the same slug exists
  let [collection, created] = await Collection.findOrCreate({
    where: { slug },
    defaults: payload,
  });

  // If the collection already existed and was not created, update it
  if (!created) {
    collection = await collection.update(payload);
  }

  return collection;
};

const createOrUpdateInscription = async (inscriptionData, collection) => {
  // Destructure inscriptionData and map it to a new payload object
  const {
    content_type: contentType,
    content_length: contentLength,
    genesis_fee: genesisFee,
    genesis_height: genesisHeight,
    offset,
    num,
    owner,
    sats,
    output,
    created: itemCreated,
    inscriptionId,
    txid,
    vout,
    value
  } = inscriptionData;

  const payload = {
    contentLength,
    contentType,
    genesisFee,
    genesisHeight,
    num,
    owner,
    sats,
    output,
    offset,
    txid,
    vout,
    value,
    created: itemCreated,
    inscriptionId,
    collectionId: collection?.id,
    id: inscriptionId
  };

  // Find the inscription with the given ID or create a new one
  let [inscription, created] = await Inscription.findOrCreate({
    where: { inscriptionId },
    defaults: payload,
  });

  // If the inscription already existed and was not created, update it
  if (!created) {
    inscription = await inscription.update(payload);
  }

  return inscription;
};

const updateInscription = async (inscriptionId) => {
  try {
    // Retrieve the inscription from the nosftCoreService
    const inscriptionCoreData = await nosftCoreService.getInscription(
      inscriptionId
    );

    // Extract the collection data
    const { collection: collectionData = null, inscription: inscriptionData } =
      inscriptionCoreData;

    // Save the collection in the database using the createOrUpdateCollection function
    if(collectionData) {
      const collection = await createOrUpdateCollection(collectionData);
      const inscription = await createOrUpdateInscription(
        inscriptionData,
        collection
      );

      return { inscription, collection };
    }

    // Save the inscription in the database using the createOrUpdateInscription function
    const inscription = await createOrUpdateInscription(
      inscriptionData
    );

    return { inscription };
  } catch (err) {
    console.error(err);
  }
};

module.exports = updateInscription;
