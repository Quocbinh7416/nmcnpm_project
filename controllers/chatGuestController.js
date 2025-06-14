"use strict";

const controller = {};
const models = require("../models");
const openAI = require("../index").default.openAI;

controller.showChat = async (req, res) => {
  return res.render("chat-guest");
};

controller.createChatMessage = async (req, res) => {
  const { message } = req.body;
  try {
    // 1. Lấy câu trả lời chính
    const completion = await openAI.chat.completions.create({
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
          content:
            "You are a friendly English-speaking partner helping the user practice spoken English. Keep your responses natural, clear, and conversational. Encourage the user to speak more by asking follow-up questions. Correct only major grammar or vocabulary mistakes, gently and briefly. Suggest better ways to say things if needed. If asked, provide pronunciation tips using phonetics or examples. Do not speak too formally unless requested. Help the user gain confidence and fluency, not just correctness. Use simple vocabulary unless the user wants advanced practice. I want your response always in English unless I ask you to speak or translate to Vietnamese.",
        },
      ],
    });
    const reply = completion.choices[0].message.content;
    console.log("OpenAI reply:", completion);
    console.log("OpenAI reply:", message);

    // 2. Lấy suggestions liên quan
    // const suggestionPrompt = `Dựa trên nội dung sau, hãy gợi ý đúng 3 câu hỏi tiếp theo mà người dùng có thể hỏi để tiếp tục cuộc trò chuyện. Trả lời bằng một mảng JSON, ví dụ: ["Câu hỏi 1", "Câu hỏi 2", "Câu hỏi 3"].\nNội dung: "${reply}"`;
    // const suggestionRes = await openai.chat.completions.create({
    //   model: 'gpt-4o-mini',
    //   messages: [
    //     { role: 'system', content: 'Bạn là một trợ lý AI.' },
    //     { role: 'user', content: suggestionPrompt }
    //   ]
    // });
    // let suggestions = [];
    // try {
    //   // Tìm mảng JSON trong câu trả lời
    //   const match = suggestionRes.choices[0].message.content.match(/\[.*\]/s);
    //   if (match) {
    //     suggestions = JSON.parse(match[0]);
    //   }
    // } catch (e) {
    //   suggestions = [];
    // }
    // // Đảm bảo luôn có đúng 3 gợi ý
    // while (suggestions.length < 3) {
    //   // Thêm gợi ý mặc định không trùng lặp
    //   const next = DEFAULT_SUGGESTIONS.find(s => !suggestions.includes(s));
    //   if (next) suggestions.push(next);
    //   else suggestions.push('Can you tell me more?');
    // }
    // if (suggestions.length > 3) suggestions = suggestions.slice(0, 3);
    res.json({ reply });
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
  const response = await openAIChat.chat.completions.create({
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
