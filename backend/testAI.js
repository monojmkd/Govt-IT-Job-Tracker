import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testAI() {
  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: "Say hello in one short sentence.",
    });

    console.log("AI Response:");
    console.log(response.output_text);
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testAI();
