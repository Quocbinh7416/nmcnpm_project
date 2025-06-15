const Sequelize = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  const Conversation = sequelize.define(
    "conversation",
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false, // Title can be null if not provided
      },
    },
    {
      tableName: "conversation",
      timestamps: false,
    }
  );

  Conversation.associate = (models) => {
    Conversation.hasMany(models.message, {
      foreignKey: "conversation_id", // Foreign key in the message table
      as: "messages", // Alias for eager loading
    });
  };

  return Conversation;
};
