const User = require("./user");
const Collection = require("./collection");
const Inscription = require("./inscription");
const Auction = require("./auction");
const Bid = require("./bid");
const Nostr = require("./nostr");

// In inscription.js
Inscription.belongsTo(Collection, {
  as: "collection",
  foreignKey: "collection_id",
});

// In collection.js
Collection.hasMany(Inscription, {
  as: "inscriptions",
  foreignKey: "collection_id",
});

Auction.belongsTo(Inscription, {
  foreignKey: "inscriptionId", // Change this to inscriptionId
  as: "inscription",
});

Bid.belongsTo(Inscription, {
  foreignKey: "inscriptionId",
  as: "inscription",
});

Bid.belongsTo(Nostr, {
  foreignKey: "nostrId",
  as: "nostr",
});

Inscription.hasMany(Auction, {
  foreignKey: "id",
  as: "auctions",
});

Inscription.hasMany(Bid, {
  foreignKey: "id",
  as: "bids",
});

module.exports = {
  User,
  Collection,
  Inscription,
  Auction,
  Bid,
  Nostr,
};
