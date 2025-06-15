"use strict";

const controller = {};
const models = require("../models");
const uuidv4 = require("uuid").v4;

const azureOpenAI = require("../index").default.azureOpenAI;

const DEFAULT_SUGGESTIONS = ["Can you explain more details?", "Give me an example.", "What are the pros and cons?", "How can I apply this in real life?", "What are the next steps?", "Can you suggest further reading?"];
const DEFAULT_CONTEXT_SYSTEM =
  "You are a friendly English-speaking partner helping the user practice spoken English. Keep your responses natural, clear, and conversational. Encourage the user to speak more by asking follow-up questions. Correct only major grammar or vocabulary mistakes, gently and briefly. Suggest better ways to say things if needed. If asked, provide pronunciation tips using phonetics or examples. Do not speak too formally unless requested. Help the user gain confidence and fluency, not just correctness. Use simple vocabulary unless the user wants advanced practice. I want your response always in English  unless I ask you to speak or translate to Vietnamese. Sometime i will speak or type with your answer but wrongly, so you should correct my mistakes gently and briefly. If I ask you to speak or translate to Vietnamese, please do so. Otherwise, always respond in English.";

controller.showChat = async (req, res) => {
  let userId = isNaN(req.params.userId) ? 0 : parseInt(req.params.userId);
  if (userId === 0) {
    console.log("User ID is 0, returning guest chat view.");
    return res.render("chat-guest", { userId, messages: [], conversationId: null });
  }

  const user = await models.user.findAll({
    where: {
      id: userId,
    },
  });

  if (!user || user.length === 0) {
    console.log("User not found, returning guest chat view.");
    return res.render("chat-guest", { userId, messages: [], conversationId: null });
  }
  try {
    const conversations = await models.conversation.findAll({
      where: {
        user_id: userId, // Assuming you want to filter by a specific user ID
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
    let email = user[0].email;

    console.log("Messages userId:", userId, conversationId, user[0].email);

    return res.render("chat", { conversations, messages, userId, conversationId, email });
  } catch (error) {
    console.error("Unable to connect to the database:", error);
    return res.status(500).render("error", { message: "Failed to retrieve chat messages" });
  }
};

controller.createChatMessage = async (req, res) => {
  const { message } = req.body;
  try {
    // 1. Lấy câu trả lời chính
    const completion = await azureOpenAI.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 1000,
      temperature: 0.7,
      top_p: 1,
      messages: [
        {
          role: "user",
          content: message,
        },

        {
          role: "system",
          content: DEFAULT_CONTEXT_SYSTEM,
        },
      ],
    });
    const reply = completion.choices[0].message.content;

    console.log(reply);

    // 2. Lấy suggestions liên quan
    const suggestionPrompt = `Dựa trên nội dung sau, hãy gợi ý đúng 3 câu hỏi tiếp theo mà người dùng có thể hỏi để tiếp tục cuộc trò chuyện. Trả lời bằng một mảng JSON, ví dụ: ["Câu hỏi 1", "Câu hỏi 2", "Câu hỏi 3"].\nNội dung: "${reply}"`;
    const suggestionRes = await azureOpenAI.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: DEFAULT_CONTEXT_SYSTEM,
        },
        { role: "user", content: suggestionPrompt },
      ],
    });
    let suggestions = [];
    console.log("suggestionRes:", suggestionRes.choices[0].message.content);

    try {
      // Tìm mảng JSON trong câu trả lời
      const match = suggestionRes.choices[0].message.content.match(/\[.*\]/s);
      if (match) {
        suggestions = JSON.parse(match[0]);
      }
    } catch (e) {
      suggestions = [];
    }
    // Đảm bảo luôn có đúng 3 gợi ý
    while (suggestions.length < 3) {
      // Thêm gợi ý mặc định không trùng lặp
      const next = DEFAULT_SUGGESTIONS.find((s) => !suggestions.includes(s));
      if (next) suggestions.push(next);
      else suggestions.push("Can you tell me more?");
    }
    if (suggestions.length > 3) suggestions = suggestions.slice(0, 3);
    res.json({ reply, suggestions });
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    res.status(500).json({ error: "Failed to get response from OpenAI" });
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

controller.createConversation = async (req, res) => {
  const { userId, title } = req.body;
  if (!userId) {
    return res.status(400).json({ error: "User ID is required to create a conversation." });
  }

  try {
    const newConversation = await models.conversation.create({
      id: uuidv4(), // Generate a unique ID for the conversation
      user_id: userId,
      created: new Date(),
      title: title || "New Conversation",
    });

    console.log("New conversation created:", newConversation);
    return res.status(201).json({ success: true, conversationId: newConversation.id, title: newConversation.title });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return res.status(500).json({ error: "Failed to create conversation" });
  }
};

controller.deleteConversation = async (req, res) => {
  const { conversationId } = req.params.id;
  if (!conversationId) {
    return res.status(400).json({ error: "Conversation ID is required to delete a conversation." });
  }

  try {
    // Delete all messages associated with the conversation
    await models.message.destroy({
      where: {
        conversation_id: conversationId,
      },
    });

    // Delete the conversation itself
    await models.conversation.destroy({
      where: {
        id: conversationId,
      },
    });

    console.log("Conversation deleted:", conversationId);
  } catch (error) {
    console.error("Error deleting conversation:", error);
  }
  res.render(`chat/${userId}`);
};

module.exports = controller;
