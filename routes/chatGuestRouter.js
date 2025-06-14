"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../controllers/chatGuestController");

router.get("/", controller.showChat);

router.post("/", controller.createChatMessage);

module.exports = router;
