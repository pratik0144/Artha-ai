import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config({ path: "frontend/.env.local" });

const API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean);

console.log("Found keys:", API_KEYS.length);

async function testKey(key, modelName) {
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Hello, how are you?");
    console.log(`Success with ${modelName}:`, result.response.text().trim());
  } catch (e) {
    console.log(`Failed with ${modelName}:`, e.message);
  }
}

for (const key of API_KEYS) {
  console.log("Testing key:", key.slice(0, 10) + "...");
  await testKey(key, "gemini-2.5-flash");
  await testKey(key, "gemini-1.5-flash");
}
