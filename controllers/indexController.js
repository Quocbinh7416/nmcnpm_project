"use strict";

const controller = {};
const models = require("../models");
const { OpenAI } = require("openai");
const customOpenAI = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

controller.showHomepage = async (req, res) => {
  const response = await customOpenAI.responses.create({
    model: "gpt-3.5-turbo",
    tools: [{ type: "web_search_preview" }],
    input: "What was a positive news story from today?",
  });

  console.log(response.output_text);
  res.render("index");
};

module.exports = controller;
