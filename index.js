"use strict";

require("dotenv").config();

const express = require("express");
const expressHandlebars = require("express-handlebars");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

// Cau hinh public static folder
app.use(express.static(__dirname + "/public"));

// // Cau hinh su dung express-handlebars
app.engine(
  "hbs",
  expressHandlebars.engine({
    layoutsDir: __dirname + "/views/layouts",
    partialsDir: __dirname + "/views/partials",
    extname: "hbs",
    defaultLayout: "layout",
    runtimeOptions: {
      allowProtoPropertiesByDefault: true,
    },
    helpers: {},
  })
);
app.set("view engine", "hbs");

// cau hinh doc du lieu post tu body
app.use(express.json());
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));

// routes
app.use("/", require("./routes/indexRouter"));

// errors
app.use((req, res, next) => {
  res.status(404).render("error", { message: "File not Found!" });
});
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).render("error", { message: "Internal Server Error!" });
});

// Khoi dong web server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
