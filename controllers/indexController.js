"use strict";

const controller = {};
const models = require("../models");
const chatController = require("./chatController");

controller.showHomepage = async (req, res) => {
  let conversationId = "abb01339-7cd8-49d3-bc0f-885ff6516792"; // Default to null if no conversations found
  let userId = 1;
  res.render("chat", { conversationId, userId });
};

// controller.showPage = async (req, res, next) => {
//   console.log("Requested page:", req.params.page);

//   const pages = ["chat"];
//   if (pages.includes(req.params.page)) chatController.showChat(req, res);
//   next();
// };

module.exports = controller;
