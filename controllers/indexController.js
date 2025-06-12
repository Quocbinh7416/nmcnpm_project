"use strict";

const controller = {};
const { where } = require("sequelize");
const models = require("../models");
const { OpenAI } = require("openai");

const customOpenAI = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
  apiKey: process.env.OPENAI_API_KEY,
});

controller.showChat = async (req, res) => {
  try {
    const conversations = await models.conversation.findAll({
      where: {
        user_id: 1, // Assuming you want to filter by a specific user ID
      },
      include: [
        {
          model: models.message,
          as: "messages", // Alias defined in the association
          order: [["created", "ASC"]], // Order messages by created in ascending order
        },
      ],
    });
    let messages = conversations[0]?.messages || [];
    console.log("Messages retrieved:", messages);

    res.locals.messages = messages;
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }

  res.render("index");
};

controller.createMessage = async (req, res) => {
  let chatMessage = req.body.chatMessage;
  console.log("Received chat message:", chatMessage);
  // const response = await customOpenAI.chat.completions.create({
  //   model: "gpt-4o-mini",
  //   max_completion_tokens: 1000,
  //   temperature: 0.7,
  //   top_p: 1,
  //   messages: [
  //     {
  //       role: "user",
  //       content: chatMessage,
  //     },

  //     {
  //       role: "system",
  //       content: "You are a helpful english tutor assistant. Please provide a concise and informative response to the user's query.",
  //     },
  //   ],
  // });

  // console.log(response.choices[0].message.content);

  res.render("index");
};

module.exports = controller;
