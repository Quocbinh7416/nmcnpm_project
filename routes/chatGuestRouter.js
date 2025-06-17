"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../controllers/chatGuestController");

router.get("/", controller.showChat);
router.get("/voice", controller.showVoice);

router.post("/", controller.createChatMessage);
router.post("/test", controller.createChatMessageV2);

module.exports = router;
