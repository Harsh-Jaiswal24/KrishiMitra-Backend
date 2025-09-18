const { getLocationDetails } = require("../services/locationService");
const { getWeatherDetails, getLongRangeForecast } = require("../services/weatherService");
const { getSoilDetails, getSoilClassification } = require("../services/soilService");
const { getCropRecommendation } = require("../services/geminiService");

exports.getRecommendation = async (req, res) => {
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
};
