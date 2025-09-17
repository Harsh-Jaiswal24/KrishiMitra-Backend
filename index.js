const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// Replace with your API keys if any
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";
const SOILGRIDS_BASE = "https://rest.isric.org/soilgrids/v2.0/properties/query";

// Helper: Reverse geocoding (using Nominatim)
async function getLocationDetails(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    // const { data } = await axios.get(url, { headers: { "User-Agent": "SIH-App/1.0" } });
    const { data } = await axios.get(url);

    return data;
}

// Helper: Weather history and forecast (Open-Meteo, free)
async function getWeatherDetails(lat, lon) {
    // For demo: limited params, check documentation for full options
    // https://open-meteo.com/en/docs
    const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation&past_days=93&forecast_days=16`;
    const { data } = await axios.get(url);
    return data;
}

async function getSoilDetails(lat, lon) {
    try {
        const url = `https://rest.isric.org/soilgrids/v2.0/properties/query?lon=${lon}&lat=${lat}&property=phh2o,ocd,cec,clay,silt,sand`;
        const { data } = await axios.get(url, { timeout: 5000 });
        return data;
    } catch (e) {
        console.error("SoilGrids API failed:", e.message);
        // Return a null object or a fallback message
        return { error: "Soil data temporarily unavailable" };
    }
}

// TODO: Integrate ISRO Bhuvan API or other Indian sources for more local soil/land data
// For now, use SoilGrids as example

app.get('/recommendation', async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
        return res.status(400).json({ error: 'lat and lon are required' });
    }

    try {
        // 1. Reverse geocode
        const locationDetails = await getLocationDetails(lat, lon);

        // 2. Weather history & forecast
        const weatherDetails = await getWeatherDetails(lat, lon);

        // 3. Soil details
        const soilDetails = await getSoilDetails(lat, lon);

        // 4. (Optional) Add more sources here, e.g., Bhuvan

        // 5. Respond
        return res.json({
            location: locationDetails,
            weather: weatherDetails,
            soil: soilDetails,
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Could not fetch data", details: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SIH Backend listening on port ${PORT}`);
});