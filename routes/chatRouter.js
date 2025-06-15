"use strict";

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const controller = require("../controllers/chatController");

router.use(userController.isLoggedIn);

router.get("/:userId", controller.showChat);

router.post("/", controller.createChatMessage);
router.post("/conversations", controller.createConversation);
router.delete("/conversations/:id", controller.deleteConversation);

module.exports = router;
