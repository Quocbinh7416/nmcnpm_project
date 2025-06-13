"use strict";

require("dotenv").config();

const express = require("express");
const expressHandlebars = require("express-handlebars");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const speech = require("@google-cloud/speech");
const chatController = require("./controllers/chatController");

const googleClient = new speech.SpeechClient({
  keyFilename: path.join(__dirname, "config", "google-service-account-key.json"),
});

exports.default = googleClient;

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 5000;

// Cau hinh public static folder
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
    helpers: {
      equals: (a, b) => a === b,
      formatDate: (date) => {
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      },
    },
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

// Endpoint for audio file uploads
app.use("/upload-audio", require("./routes/audioRouter"));
app.use("/chat", require("./routes/chatRouter"));

// errors
app.use((req, res, next) => {
  res.status(404).render("error", { message: "File not Found!" });
});
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).render("error", { message: "Internal Server Error!" });
});

// --- Socket.IO ---
io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  // Handle chat messages (text or audio URLs)
  socket.on("chat message", async (msg) => {
    try {
      // Call the chatController logic directly
      const response = await chatController.handleChatMessage(msg);
      if (response && response.success) {
        socket.emit("chat response", response);
      }
    } catch (error) {
      console.error("Error handling chat message:", error);
      socket.emit("chat response", { error: "Failed to process message." });
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected", socket.id);
  });
});

// Khoi dong web server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
