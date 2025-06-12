module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define(
    "message",
    {
      id: {
        type: DataTypes.UUID, // Use UUID for unique identification
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4, // Automatically generate UUID
      },
      conversation_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      role: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      created: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "message",
      timestamps: false,
    }
  );

  Message.associate = (models) => {
    Message.belongsTo(models.conversation, {
      foreignKey: "conversation_id", // Foreign key in the message table
      as: "conversation", // Alias for reverse association
    });
  };

  return Message;
};
