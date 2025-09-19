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
const app = express();
require("dotenv").config();

const cors = require('cors');

 app.use(cors({
      origin: '*' // Allow all origins
    }));

const { GoogleGenerativeAI } = require("@google/generative-ai");
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const recommendationRoutes = require("./routes/recommendationRoutes");


app.use(express.json());

const PORT = process.env.PORT || 3000;

// Gemini AI Setup
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

// Health Check
app.get("/health", (req, res) => {
  res.send("✅ All Is Okay — Server Running");
});

// 🌾 TEST RECOMMENDATION ROUTE (NO location API, Gemini handles everything)
app.get("/test-recommendation", async (req, res) => {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: "lat and lon query params are required" });
    }

    // 🔥 Directly give Gemini the coordinates, let it figure out soil, weather, and crops
    const prompt = `
You are an expert crop advisor AI.
Analyze the following coordinates: latitude ${lat}, longitude ${lon}.

1. Find the exact location (state, district, village if possible).
2. Get relevant weather details, rainfall, temperature range, and soil type for this location.
3. Recommend the 5 most efficient and profitable crops for this location based on soil, climate, and profitability.

Return STRICTLY valid JSON in this format:

{
  "location": {
    "coordinates": { "lat": "${lat}", "lon": "${lon}" },
    "detected_location": "string - name of village/district/state",
    "weather_summary": "short summary of weather & climate",
    "soil_summary": "soil type, fertility, and moisture capacity"
  },
  "ai_crop_recommendations": {
    "recommended_crops": [
      {
        "name": "Crop Name",
        "reason": "Why it is suitable here",
        "estimate time": "duration in days/months",
        "water requirements": "low/medium/high (mm range)",
        "explanation": "Detailed description about crop choice and local suitability",
        "fertilizer requirement": "NPK details",
        "pesticides requirement": "low/medium/high + key pests",
        "expected yield range": "per hectare yield range",
        "sustainability note": "tips to improve soil health, water conservation"
      }
    ]
  }
}
Only output valid JSON. Do not include markdown, comments, or extra text.
    `;

    // Call Gemini
    const result = await geminiModel.generateContent(prompt);
    const aiResponse = result?.response?.text() || "{}";

    res.setHeader("Content-Type", "application/json");
    res.send(aiResponse); // ✅ Send raw Gemini output

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

// Keep-alive ping (for Render free tier)
setInterval(() => console.log("⏳ Keep-alive ping..."), 5 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
