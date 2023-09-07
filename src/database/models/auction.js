const { Model, DataTypes } = require("sequelize");
const sequelize = require("../connection");

class Auction extends Model {}

Auction.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    initialPrice: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    inscriptionId: {
      type: DataTypes.STRING, // Change this to match the data type of the id in the Inscription model
      allowNull: false,
    },
    collection: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    decreaseAmount: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    btcAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    currentPrice: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    startTime: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    scheduledISODate: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "scheduled_iso_date",
    },
    output: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "item_output",
    },
    reservePrice: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    secondsBetweenEachDecrease: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  {
    sequelize,
    freezeTableName: false,
    underscored: true,
    modelName: "auction",
  }
);

module.exports = Auction;
