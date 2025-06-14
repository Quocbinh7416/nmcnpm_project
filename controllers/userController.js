"use strict";

const controller = {};
const passport = require("./passport");
const models = require("../models");

controller.login = (req, res, next) => {
  passport.authenticate("local-login", (error, user) => {
    if (error) {
      return res.render("index", { loginMessage: error.message || "An error occurred during login." });
    }
    if (!user) {
      return res.render("index", { loginMessage: "Invalid email or password." });
    }
    req.logIn(user, (error) => {
      if (error) {
        return next(error);
      }
      console.log("User logged in:", user.email, user.id);
      return res.redirect(`/chat/${user.id}`); // Redirect to chat page with user ID
    });
  })(req, res, next);
};

controller.logout = (req, res, next) => {
  req.logout((error) => {
    if (error) {
      return next(error);
    }
    res.redirect("/");
  });
};

controller.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect(`/`);
};

controller.register = (req, res, next) => {
  let reqUrl = req.body.reqUrl ? req.body.reqUrl : "/";
  passport.authenticate("local-register", (error, user) => {
    if (error) {
      return next(error);
    }
    if (!user) {
      console.log("User already exists or registration failed.");
      return res.redirect(reqUrl);
    }

    req.logIn(user, (error) => {
      if (error) {
        return next(error);
      }
      res.redirect(reqUrl);
    });
  })(req, res, next);
};

module.exports = controller;
