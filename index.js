"use strict";

require("dotenv").config();

const express = require("express");
const expressHandlebars = require("express-handlebars");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const speech = require("@google-cloud/speech");
const session = require("express-session");

const redisStore = require("connect-redis").default;
const { createClient } = require("redis");
const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});
redisClient.connect().catch(console.error);
const passport = require("./controllers/passport");
const flash = require("connect-flash");

const googleClient = new speech.SpeechClient({
  credentials: {
    type: process.env.GOOGLE_TYPE,
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"), // Replace escaped newlines
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: process.env.GOOGLE_AUTH_URI,
    token_uri: process.env.GOOGLE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_CERT_URL,
    client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
  },
});

const { OpenAI } = require("openai");

const azureOpenAI = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL,
  apiKey: process.env.OPENAI_AZURE_API_KEY,
});

const openAI = new OpenAI({
  baseURL: "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY,
});

exports.default = { googleClient, azureOpenAI, openAI };

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

// cau hinh su dung session
app.use(
  session({
    secret: process.env.REDIS_URL || "redis://localhost:6379",
    store: new redisStore({ client: redisClient }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 20 * 60 * 1000, //20 mins
    },
  })
);
// cau hinh su dung passport
app.use(passport.initialize());
app.use(passport.session());

// cau hinh su dung connect-flash
app.use(flash());

// routes
app.use("/", require("./routes/indexRouter"));
app.use("/upload-audio", require("./routes/audioRouter"));
app.use("/chat-guest", require("./routes/chatGuestRouter"));
app.use("/chat-voice", require("./routes/chatGuestRouter"));

app.use("/users", require("./routes/userRouter"));
// middleware khoi tao gio hang
app.use((req, res, next) => {
  res.locals.isLoggedIn = req.isAuthenticated();
  next();
});
app.use("/chat", require("./routes/chatRouter"));

// errors
app.use((req, res, next) => {
  console.log("404 Not Found:", req.originalUrl);
  res.status(404).render("error", { message: "File not Found!" });
});
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).render("error", { message: "Internal Server Error!" });
});

// // --- Socket.IO ---
// io.on("connection", (socket) => {
//   console.log("a user connected", socket.id);

//   // Handle chat messages (text or audio URLs)
//   socket.on("chat message", async (msg) => {
//     try {
//       // Call the chatController logic directly
//       const response = await chatController.handleChatMessage(msg);
//       if (response && response.success) {
//         socket.emit("chat response", response);
//       }
//     } catch (error) {
//       console.error("Error handling chat message:", error);
//       socket.emit("chat response", { error: "Failed to process message." });
//     }
//   });

//   socket.on("disconnect", () => {
//     console.log("user disconnected", socket.id);
//   });
// });

// Khoi dong web server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
