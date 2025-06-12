"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../controllers/audioController");

router.post("/", controller.uploadAudio, controller.recordAudio);

module.exports = router;
