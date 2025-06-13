"use strict";

const controller = {};
const models = require("../models");
const chatController = require("./chatController");

controller.showHomepage = async (req, res) => {
  res.render("index");
};

// controller.showPage = async (req, res, next) => {
//   console.log("Requested page:", req.params.page);

//   const pages = ["chat"];
//   if (pages.includes(req.params.page)) chatController.showChat(req, res);
//   next();
// };

module.exports = controller;
