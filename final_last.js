const express = require("express");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai"); // Gemini SDK
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ------------------------------
// API BASE URLs & KEYS
// ------------------------------
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";
const TOMORROWIO_BASE = "https://api.tomorrow.io/v4/weather/forecast";
const TOMORROWIO_API_KEY =
  process.env.TOMORROWIO_API_KEY;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const SOILGRIDS_PROPERTIES_URL =
  "https://rest.isric.org/soilgrids/v2.0/properties/query";
const SOILGRIDS_CLASSIFICATION_URL =
  "https://rest.isric.org/soilgrids/v2.0/classification/query";

// ------------------------------
// SoilGrids Parameters
// ------------------------------
const soilProperties = [
  "bdod",
  "cec",
  "cfvo",
  "clay",
  "nitrogen",
  "ocd",
  "ocs",
  "phh2o",
  "sand",
  "silt",
  "soc",
  "wv0010",
  "wv0033",
  "wv1500",
];

const soilDepths = [
  "0-5cm",
  "0-30cm",
  "5-15cm",
  "15-30cm",
  "30-60cm",
  "60-100cm",
  "100-200cm",
];

const soilValues = ["Q0.05", "Q0.5", "Q0.95", "mean", "uncertainty"];

// ------------------------------
// Helper Functions
// ------------------------------
async function getLocationDetails(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const { data } = await axios.get(url, { timeout: 10000}) ;  
    return data;
  } catch (err) {
    console.error("Location API failed:", err.message);
    return { error: "Location data unavailable" };
  }
}

async function getWeatherDetails(lat, lon) {
  try {
 
 const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}` +
      "&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,cloudcover,wind_speed_10m,wind_direction_10m,soil_temperature_0cm,soil_moisture_0_1cm" +
      "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset,uv_index_max" +
      "&past_days=93&forecast_days=16";

    const { data } = await axios.get(url, { timeout: 10000 });
    return data;
  } catch (err) {
    console.error("Weather API failed:", err.message);
    return { error: "Weather data unavailable" };
  }
}

async function getLongRangeForecast(lat, lon) {
  try {
    if (!TOMORROWIO_API_KEY) {
      return { error: "Tomorrow.io API key not set" };
    }
    const url = `${TOMORROWIO_BASE}?location=${lat},${lon}&apikey=${TOMORROWIO_API_KEY}&timesteps=1d&fields=temperature,humidity,precipitationProbability,windSpeed,cloudCover,soilMoisture,soilTemperature`;
    const { data } = await axios.get(url, { timeout: 10000 });
    return data;
  } catch (err) {
    console.error("Long-range forecast API failed:", err.message);
    return { error: "Long-range forecast unavailable" };
  }
}

async function getSoilDetails(lat, lon) {
  const params = new URLSearchParams();
  params.append("lon", lon);
  params.append("lat", lat);
  soilProperties.forEach((p) => params.append("property", p));
  soilDepths.forEach((d) => params.append("depth", d));
  soilValues.forEach((v) => params.append("value", v));

  try {
    const url = `${SOILGRIDS_PROPERTIES_URL}?${params.toString()}`;
    // const { data } = await axios.get(url, { timeout: 10000 }); BEFORE WITH TIMEOUT
    const { data } = await axios.get(url);  //NO TIMEOUT

    return data;
  } catch (e) {
    console.error("SoilGrids API failed:", e.message);
    return { error: "Soil data temporarily unavailable" };
  }
}

async function getSoilClassification(lat, lon) {
  const params = new URLSearchParams();
  params.append("lon", lon);
  params.append("lat", lat);
  params.append("number_classes", "33");

  try {
    const url = `${SOILGRIDS_CLASSIFICATION_URL}?${params.toString()}`;
    // const { data } = await axios.get(url, { timeout: 10000 });

    const { data } = await axios.get(url);


    return data;
  } catch (e) {
    console.error("SoilGrids Classification API failed:", e.message);
    return { error: "Soil classification data temporarily unavailable" };
  }
}

// ------------------------------
// Gemini Crop Recommendation
// ------------------------------
async function getCropRecommendation(location, weather, soilProps, soilClass) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const prompt = `
You are an agricultural expert AI. Based on the following data, recommend the top 5 most suitable crops for this region right now to grow by farmers based on given data also check current water details of that location by yourself which crop will be highly efficient and supportive in given expected weather , temperature and other soil detials of given and next few months .
Provide **only valid JSON** as output, with no extra commentary or markdown.
 
Data:
- Location: ${JSON.stringify(location)}
- Weather Summary: ${JSON.stringify(weather?.daily?.temperature_2m_max || weather)}
- Soil Properties: ${JSON.stringify(soilProps)}
- Soil Classification: ${JSON.stringify(soilClass)}

Strict Output Format:
{
  "recommended_crops": 
  [
    { 
    
    "name": "CropName",
    "reason": "Why this crop is suitable",
    "estimate time":"Time duration of complete crop lifecycle",
    "water requirements ":"Water requried",
    "explanation": "Also include a short explanation for each crop, considering soil type, weather, rainfall, and temperature trends"   ,
    "fertilizer requirement": "fertilizer suggestions if they are safe to use not harm if there any otherwise null", 
    "pesticides requirement": "safe pesticide advice if there any otherwise null",
    "expected yield range":"Expected yield range",
    "sustainability note" : "(e.g., crop rotation, soil fertility)."
    
    }
  ]

  all data should be return in very easy english in understandable formate to every indian 
}
`;
  //  data in hindi language paste it on two line above

    const result = await model.generateContent(prompt);
    let text = result.response.text();

    // 🟢 Clean and sanitize Gemini output
    text = text.replace(/```json|```/g, "").trim();

    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("⚠️ JSON parse failed:", e.message, "\nRaw Gemini output:", text);
      return {
        recommended_crops: [
          { name: "AI Output (Unparsed)", reason: text },
        ],
      };
    }
  } catch (error) {
    console.error("Gemini AI error:", error.message);
    return {
      recommended_crops: [
        { name: "AI unavailable", reason: "Error generating recommendation" },
      ],
    };
  }
}

// ------------------------------
// ROUTES
// ------------------------------
app.get("/recommendation", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "lat and lon are required" });
  }

  try {
    const [locationDetails, weatherDetails, longRangeForecast, soilProps, soilClass] =
      await Promise.all([
        getLocationDetails(lat, lon),
        getWeatherDetails(lat, lon),
        getLongRangeForecast(lat, lon),
        getSoilDetails(lat, lon),
        getSoilClassification(lat, lon),
      ]);

    const cropRecommendation = await getCropRecommendation(
      locationDetails,
      weatherDetails,
      soilProps,
      soilClass
    );

    res.json({
      location: locationDetails,
      ai_crop_recommendations: cropRecommendation,
    });
  } catch (error) {
    console.error("Recommendation endpoint error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ------------------------------
// SERVER START
// ------------------------------
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
