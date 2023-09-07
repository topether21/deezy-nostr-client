const { Model, DataTypes } = require("sequelize");
const sequelize = require("../connection");
const Inscription = require("./inscription");
const Nostr = require("./nostr");

class Bid extends Model {}

Bid.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    price: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    bidOwner: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ordinalOwner: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nostrId: {
      type: DataTypes.STRING,
      references: {
        model: Nostr,
        key: "id",
      },
    },
    output: {
      type: DataTypes.TEXT,
      field: "item_output",
    },
    bidCreatedAt: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    inscriptionId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: {
        model: Inscription, // assuming the inscription model name is 'inscription'
        key: "id",
      },
    },
  },
  {
    sequelize,
    freezeTableName: false,
    underscored: true,
    modelName: "bid",
  }
);

module.exports = Bid;
