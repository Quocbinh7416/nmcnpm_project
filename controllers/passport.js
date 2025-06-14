"use strict";

const passport = require("passport");
const LocalStrategy = require("passport-local");
const bcypt = require("bcrypt");
const models = require("../models");

// Ham duoc goi khi xac thuc thanh cong va luu thong tin user vao session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Ham duoc goi boi passport.session de lay thong tin cua user tu csdl va dua vao req.user
passport.deserializeUser(async (id, done) => {
  try {
    let user = await models.user.findOne({
      attributes: ["id", "email"],
      where: { id },
    });
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Ham xac thuc nguoi dung khi dang nhap
passport.use(
  "local-login",
  new LocalStrategy(
    {
      usernameField: "email", // ten dang nhap la email
      passwordField: "password",
      passReqToCallback: true, // cho phep truyen req vao callback de kiem tra user da dang nhap chua
    },
    async (req, email, password, done) => {
      console.log("Login attempt for email:", email);
      if (email) {
        email = email.toLowerCase(); // chuyen email sang ki tu thuong
      }
      try {
        if (!req.user) {
          // neu user chua dang nhap
          let user = await models.user.findOne({ where: { email } });

          if (!user) {
            return done(null, false, req.flash("loginMessage", "Email does not exist!"));
          }
          if (!bcypt.compareSync(password, user.password)) {
            return done(null, false, req.flash("loginMessage", "Invalid password!"));
          }

          // Cho phep dang nhap
          return done(null, user);
        }
        // user dang nhap roi thi bo qua dang nhap
        done(null, req.user);
      } catch (error) {
        done(error);
      }
    }
  )
);

// Ham dang ky tai khoan
passport.use(
  "local-register",
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, email, password, done) => {
      if (email) {
        email = email.toLowerCase();
      }
      if (req.user) {
        // neu nguoi dung da dang nhap, bo qua
        return done(null, req.user);
      }
      try {
        let user = await models.user.findOne({ where: { email } });
        if (user) {
          // neu email da ton tai
          return done(null, false, req.flash("registerMessage", "Email is already taken!"));
        }

        // tao user moi
        user = await models.user.create({
          email: email,
          password: bcypt.hashSync(password, bcypt.genSaltSync(8)),
        });

        // thong bao dang ki thanh cong
        done(null, false, req.flash("registerMessage", "You have registered successfully. Please login!"));
      } catch (error) {
        done(error);
      }
    }
  )
);

module.exports = passport;
