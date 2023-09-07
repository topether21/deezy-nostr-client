const { Model, DataTypes } = require("sequelize");
const sequelize = require("../connection");
const Inscription = require("./inscription");

class Nostr extends Model {}

Nostr.findOrCreateFromProps = async function (props) {
  // Extract the price from the tags array
  const priceTag = props.tags.find((tag) => tag[0] === "s");
  const price = priceTag ? priceTag[1] : null;

  // Extract the type from the tags array
  const typeTag = props.tags.find((tag) => tag[0] === "t");
  const type = typeTag ? typeTag[1] : null;

  // Extract the exchange from the tags array
  const exchangeTag = props.tags.find((tag) => tag[0] === "x");
  const exchange = exchangeTag ? exchangeTag[1] : null;

  // Extract the utxo from the tags array
  const utxoTag = props.tags.find((tag) => tag[0] === "u");
  const utxo = utxoTag ? utxoTag[1] : null;

  // Extract the inscriptionId from the tags array
  const inscriptionIdTag = props.tags.find((tag) => tag[0] === "i");
  const inscriptionId = inscriptionIdTag ? inscriptionIdTag[1] : null;

  // Create the

  const payload = {
    id: props.id,
    kind: props.kind,
    pubkey: props.pubkey,
    content: props.content,
    tags: props.tags,
    eventCreatedAt: props.created_at,
    sig: props.sig,
    price,
    value: price,
    type,
    exchange,
    utxo,
    inscriptionId,
  };

  // Check if a nostr with the same sig already exists
  const [nostr] = await this.findOrCreate({
    where: { sig: props.sig },
    defaults: payload,
  });

  return nostr;
};

Nostr.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    kind: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pubkey: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    eventCreatedAt: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "item_content",
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    sig: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "item_type",
    },
    utxo: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "item_value",
    },
    exchange: {
      type: DataTypes.STRING,
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
    modelName: "nostr_events",
  }
);

module.exports = Nostr;
