const { DataTypes, Model } = require("sequelize");
const sequelize = require("../connection");
const Collection = require("./collection");

class Inscription extends Model {}

Inscription.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    contentLength: {
      type: DataTypes.INTEGER,
    },
    contentType: {
      type: DataTypes.TEXT,
    },
    created: {
      type: DataTypes.BIGINT,
    },
    genesisFee: {
      type: DataTypes.INTEGER,
    },
    genesisHeight: {
      type: DataTypes.INTEGER,
    },
    num: {
      type: DataTypes.TEXT,
      field: "item_num",
    },
    owner: {
      type: DataTypes.TEXT,
      field: "item_owner",
    },
    sats: {
      type: DataTypes.INTEGER,
    },
    output: {
      type: DataTypes.TEXT,
      field: "item_output",
    },
    offset: {
      type: DataTypes.INTEGER,
      field: "item_offset",
    },
    txid: {
      type: DataTypes.TEXT,
    },
    vout: {
      type: DataTypes.INTEGER,
    },
    value: {
      type: DataTypes.TEXT,
      field: "item_value",
    },
    inscriptionId: {
      type: DataTypes.TEXT,
    },
    collectionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Collection,
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "inscription",
    freezeTableName: false,
    underscored: true,
  }
);

module.exports = Inscription;
