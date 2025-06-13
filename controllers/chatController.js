"use strict";

const controller = {};
const { where, UUID } = require("sequelize");
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
    let conversationId = conversations[0]?.id || null; // Default to null if no conversations found
    let userId = conversations[0]?.user_id || 1; // Default to user ID 1 if no conversations found
    console.log("Messages userId:", userId, conversationId);

    return res.render("chat", { messages, userId, conversationId });
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    return res.status(500).render("error", { message: "Failed to retrieve chat messages" });
  }
};

controller.handleChatMessage = async (msg) => {
  let result = [{}];
  const conversationId = msg.conversationId;
  if (!conversationId) {
    throw new Error("Conversation ID is required to save the message.");
  }

  const content = msg.content;
  const userId = msg.user_id || 0;
  const role = msg.role || "user";

  try {
    const newMessage = await models.message.create({
      conversation_id: conversationId,
      content: content,
      role: role,
      created: new Date(),
    });
    result.push({ role: role, content: content });
    console.log("Message created:", newMessage);
  } catch (error) {
    console.log("Error saving message to database:", error);
  }
  const response = await customOpenAI.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 1000,
    temperature: 0.7,
    top_p: 1,
    messages: [
      {
        role: "user",
        content: content,
      },

      {
        role: "system",
        content:
          "You are a friendly English-speaking partner helping the user practice spoken English. Keep your responses natural, clear, and conversational. Encourage the user to speak more by asking follow-up questions. Correct only major grammar or vocabulary mistakes, gently and briefly. Suggest better ways to say things if needed. If asked, provide pronunciation tips using phonetics or examples. Do not speak too formally unless requested. Help the user gain confidence and fluency, not just correctness. Use simple vocabulary unless the user wants advanced practice.",
      },
    ],
  });

  console.log(response.choices[0].message.content);
  if (!response || !response.choices || response.choices.length === 0) {
    throw new Error("No response from OpenAI API.");
  }
  try {
    await models.message.create({
      conversation_id: conversationId,
      content: response.choices[0].message.content,
      role: "system",
      created: new Date(),
    });

    result.push({ role: "system", content: response.choices[0].message.content });
  } catch (error) {
    console.log("Error saving message to database:", error);
  }

  return { success: true, result: result };
};

module.exports = controller;
