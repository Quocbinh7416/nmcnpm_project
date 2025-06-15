var DataTypes = require("sequelize").DataTypes;
var _conversation = require("./conversation");
var _message = require("./message");
var _user = require("./user");

function initModels(sequelize) {
  var conversation = _conversation(sequelize, DataTypes);
  var message = _message(sequelize, DataTypes);
  var user = _user(sequelize, DataTypes);

  message.belongsTo(conversation, { as: "conversation", foreignKey: "conversation_id"});
  conversation.hasMany(message, { as: "messages", foreignKey: "conversation_id"});

  return {
    conversation,
    message,
    user,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
