"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../controllers/indexController");

router.get("/", controller.showHomepage);

router.get("/test", controller.test);

router.get("/:page", controller.showPage);

module.exports = router;
