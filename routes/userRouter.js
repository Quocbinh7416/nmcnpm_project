"use strict";

const express = require("express");
const router = express.Router();
const controller = require("../controllers/userController");
const { body, getErrorMessage } = require("../controllers/validator");

router.post(
  "/login",
  body("email").trim().notEmpty().withMessage("Email is required!"),
  body("password").trim().notEmpty().withMessage("Password is required!"),
  (req, res, next) => {
    let message = getErrorMessage(req);
    if (message) {
      console.log("Login validation error:", message);

      return res.render("index", { loginMessage: message });
    }
    next();
  },
  controller.login
);

router.get("/logout", controller.logout);

router.post(
  "/register",
  body("email").trim().notEmpty().withMessage("Email is required!"),
  body("password").trim().notEmpty().withMessage("Password is required!"),
  body("confirmPassword").custom((confirmPassword, { req }) => {
    if (confirmPassword != req.body.password) {
      throw new Error("Password not match!");
    }
    return true;
  }),
  (req, res, next) => {
    let message = getErrorMessage(req);
    if (message) {
      return res.status(400).json({ message });
    }
    next();
  },
  controller.register
);

module.exports = router;
