// const express = require("express");
// require("dotenv").config();

// const recommendationRoutes = require("./routes/recommendationRoutes");

// const app = express();
// app.use(express.json());

// const PORT = process.env.PORT || 3000;

// app.get("/health",(req,res)=>{
//   res.send("All Is Okay Server Running");
// })

// // Routes
// app.use("/recommendation", recommendationRoutes);

// // Start server
// app.listen(PORT, () => {
//   console.log(`✅ Server running at http://localhost:${PORT}`);
// });


const express = require("express");
const axios = require("axios");
require("dotenv").config();

const { GoogleGenerativeAI } = require("@google/generative-ai");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const recommendationRoutes = require("./routes/recommendationRoutes");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Gemini AI Setup
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

// Health Check
app.get("/health", (req, res) => {
  res.send("✅ All Is Okay — Server Running");
});

// 🌾 TEST RECOMMENDATION ROUTE (No validation, direct Gemini output)
app.get("/test-recommendation", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: "lat and lon query params are required" });
    }

    // 1️⃣ Fetch location details
    const locationUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const locationResponse = await axios.get(locationUrl);
    const locationData = locationResponse.data;

    // 2️⃣ Prompt for Gemini
    const prompt = `
You are an expert crop advisor. Based on the following location details:
${JSON.stringify(locationData)}

Recommend 5 crops suitable for this location.
Include fields:
name, reason, estimate time, water requirements, explanation,
fertilizer requirement, pesticides requirement, expected yield range, sustainability note.

Return ONLY valid JSON in this format:

{
  "location": ${JSON.stringify(locationData)},
  "ai_crop_recommendations": {
    "recommended_crops": [ ... ]
  }
}
`;

    // 3️⃣ Get AI Response (Send directly without parsing)
    const result = await geminiModel.generateContent(prompt);
    const aiResponse = result?.response?.text() || "{}";

    res.setHeader("Content-Type", "application/json");
    res.send(aiResponse); // Send raw response from Gemini (no validation)

  } catch (error) {
    console.error("❌ Test Recommendation Error:", error.message);
    res.status(500).json({
      error: "Failed to generate crop recommendation",
      details: error.message,
    });
  }
});

// Main Recommendation Routes
app.use("/recommendation", recommendationRoutes);

// Keep-alive ping (for free hosts like Render)
setInterval(() => console.log("⏳ Keep-alive ping..."), 5 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
