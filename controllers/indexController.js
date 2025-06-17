"use strict";

const controller = {};
const models = require("../models");
const chatController = require("./chatController");

controller.showHomepage = async (req, res) => {
  res.render("index");
};

controller.test = async (req, res) => {
  await models.user.findAll().then((users) => {
    return res.json({
      message: "This is a test endpoint",
      user: users,
    });
  });
};
controller.showPage = async (req, res, next) => {
  console.log("Requested page:", req.params.page);

  const pages = ["chat", "call-voice"];
  let conversationId = "abb01339-7cd8-49d3-bc0f-885ff6516792"; // Default to null if no conversations found
  let userId = 1;
  if (req.params.page === "call-voice") return res.render("voice", { conversationId, userId });
  if (req.params.page === "chat") res.render("chat", { conversationId, userId });
  next();
};

module.exports = controller;
