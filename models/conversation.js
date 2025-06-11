const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('conversation', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'conversation',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "conversation_pk",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
};
