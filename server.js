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

const recommendationRoutes = require("./routes/recommendationRoutes");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Gemini AI Setup (force 2.5-pro here)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

// Health Check
app.get("/health", (req, res) => {
  res.send("✅ All Is Okay — Server Running");
});

// 🌾 TEST RECOMMENDATION ROUTE
app.get("/test-recommendation", async (req, res) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: "lat and lon query params are required" });
    }

    // 1️⃣ Fetch location details from OpenStreetMap
    const locationUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const locationResponse = await axios.get(locationUrl);
    const locationData = locationResponse.data;

    // 2️⃣ Prepare Gemini prompt (STRICT JSON)
    const prompt = `
You are an expert crop advisor. Based on the following location details:
${JSON.stringify(locationData)}

Recommend 5 crops suitable for this location. 
For EACH crop include:
- name
- reason
- estimate time (growing duration)
- water requirements
- explanation
- fertilizer requirement
- pesticides requirement
- expected yield range
- sustainability note

Return STRICTLY in this JSON format (no extra text, no markdown):

{
  "location": ${JSON.stringify(locationData)},
  "ai_crop_recommendations": {
    "recommended_crops": [
      {
        "name": "Wheat",
        "reason": "...",
        "estimate time": "...",
        "water requirements ": "...",
        "explanation": "...",
        "fertilizer requirement": "...",
        "pesticides requirement": "...",
        "expected yield range": "...",
        "sustainability note": "..."
      }
    ]
  }
}
Only respond with valid JSON. Do not include markdown, comments, or extra text.
    `;

    // 3️⃣ Generate response with Gemini 2.5 Pro
    const result = await geminiModel.generateContent(prompt);
    const aiResponse = result?.response?.text();

    let parsedData;
    try {
      parsedData = JSON.parse(aiResponse);
    } catch (err) {
      console.error("❌ Gemini returned invalid JSON. Fallback to dummy data.");
      parsedData = {
        location: locationData,
        ai_crop_recommendations: {
          recommended_crops: [
            {
              name: "Wheat",
              reason: "Fallback crop recommendation (Gemini failed).",
              "estimate time": "6-7 months",
              "water requirements ": "Moderate",
              explanation: "Fallback data — AI response failed.",
              "fertilizer requirement": "Balanced NPK",
              "pesticides requirement": "Minimal use",
              "expected yield range": "3-5 tonnes/ha",
              "sustainability note": "Rotate with legumes"
            }
          ]
        }
      };
    }

    // Simulate small delay (2s)
    await new Promise(resolve => setTimeout(resolve, 2000));

    res.json(parsedData);

  } catch (error) {
    console.error("❌ Test Recommendation Error:", error.message);
    res.status(500).json({
      error: "Failed to generate crop recommendation",
      details: error.message
    });
  }
});

// Main Recommendation Routes
app.use("/recommendation", recommendationRoutes);

// Keep server awake (Render free tier)
setInterval(() => console.log("⏳ Keep-alive ping..."), 5 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
