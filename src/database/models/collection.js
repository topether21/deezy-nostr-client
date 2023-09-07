const { DataTypes, Model } = require("sequelize");
const sequelize = require("../connection");

class Collection extends Model {}

Collection.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.TEXT,
    },
    inscriptionIcon: {
      type: DataTypes.TEXT,
    },
    supply: {
      type: DataTypes.TEXT,
    },
    slug: {
      type: DataTypes.TEXT,
    },
    description: {
      type: DataTypes.TEXT,
    },
    twitterLink: {
      type: DataTypes.TEXT,
    },
    discordLink: {
      type: DataTypes.TEXT,
    },
    websiteLink: {
      type: DataTypes.TEXT,
    },
    icon: {
      type: DataTypes.TEXT,
    },
  },
  {
    sequelize,
    modelName: "collection",
    freezeTableName: false,
    underscored: true,
  }
);

module.exports = Collection;
