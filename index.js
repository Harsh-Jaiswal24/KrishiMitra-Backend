const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";
const SOILGRIDS_BASE = "https://rest.isric.org/soilgrids/v2.0/properties/query";
// Tomorrow.io (for long-range) - get your free API key at https://app.tomorrow.io/development/keys
const TOMORROWIO_BASE = "https://api.tomorrow.io/v4/weather/forecast";
const TOMORROWIO_API_KEY = "PZeNcEyRv7n0xyeHM52mQIJhhQKKanVr"; // Replace with your API key

// Helper: Reverse geocoding (Nominatim)
async function getLocationDetails(lat, lon) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
        const { data } = await axios.get(url);
        return data;
    } catch (err) {
        console.error("Location API failed:", err.message);
        return { error: "Location data unavailable" };
    }
}

// Helper: Weather history + next 16 days (Open-Meteo)
async function getWeatherDetails(lat, lon) {
    try {
        const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}` +
            "&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,apparent_temperature,precipitation_probability," +
            "precipitation,rain,showers,snowfall,snow_depth,weathercode,pressure_msl,surface_pressure,cloudcover," +
            "cloudcover_low,cloudcover_mid,cloudcover_high,visibility,evapotranspiration,et0_fao_evapotranspiration," +
            "vapor_pressure_deficit,wind_speed_10m,wind_speed_80m,wind_speed_120m,wind_speed_180m," +
            "wind_direction_10m,wind_direction_80m,wind_direction_120m,wind_direction_180m,wind_gusts_10m," +
            "temperature_80m,temperature_120m,temperature_180m,soil_temperature_0cm,soil_temperature_6cm," +
            "soil_temperature_18cm,soil_temperature_54cm,soil_moisture_0_1cm,soil_moisture_1_3cm,soil_moisture_3_9cm," +
            "soil_moisture_9_27cm,soil_moisture_27_81cm" +
            "&daily=weathercode,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min," +
            "sunrise,sunset,daylight_duration,sunshine_duration,uv_index_max,uv_index_clear_sky_max,rain_sum,showers_sum," +
            "snowfall_sum,precipitation_sum,precipitation_hours,precipitation_probability_max,wind_speed_10m_max," +
            "wind_gusts_10m_max,wind_direction_10m_dominant,shortwave_radiation_sum,et0_fao_evapotranspiration" +
            "&past_days=93&forecast_days=16";
        const { data } = await axios.get(url, { timeout: 10000 });
        return data;
    } catch (err) {
        console.error("Weather API failed:", err.message);
        return { error: "Weather data unavailable" };
    }
}

// Helper: Future weather (next 90 days), example with Tomorrow.io
async function getLongRangeForecast(lat, lon) {
    try {
        if (TOMORROWIO_API_KEY === "YOUR_TOMORROW_API_KEY") {
            return { error: "Tomorrow.io API key not set" };
        }
        const url = `${TOMORROWIO_BASE}?location=${lat},${lon}&apikey=${TOMORROWIO_API_KEY}&timesteps=1d&fields=temperature,humidity,precipitationIntensity,precipitationProbability,windSpeed,windGust,windDirection,cloudCover,uvIndex,visibility,weatherCode,soilMoisture,soilTemperature,surfacePressure`;
        const { data } = await axios.get(url, { timeout: 10000 });
        return data;
    } catch (err) {
        console.error("Long-range forecast API failed:", err.message);
        return { error: "Long-range forecast unavailable" };
    }
}

// Helper: Soil data (SoilGrids)
async function getSoilDetails(lat, lon) {
    try {
        const url = `${SOILGRIDS_BASE}?lon=${lon}&lat=${lat}&property=phh2o,ocd,cec,clay,silt,sand`;
        const { data } = await axios.get(url, { timeout: 5000 });
        return data;
    } catch (e) {
        console.error("SoilGrids API failed:", e.message);
        return { error: "Soil data temporarily unavailable" };
    }
}

app.get('/recommendation', async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
        return res.status(400).json({ error: 'lat and lon are required' });
    }

    // Parallelize all external requests
    const [locationDetails, weatherDetails, longRangeForecast, soilDetails] = await Promise.all([
        getLocationDetails(lat, lon),
        getWeatherDetails(lat, lon),
        getLongRangeForecast(lat, lon),
        getSoilDetails(lat, lon),
    ]);

    // Compose response, note errors in each field if any
    return res.json({
        location: locationDetails,
        weather_recent_and_short_term: weatherDetails,
        weather_long_term: longRangeForecast,
        soil: soilDetails,
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`SIH Backend listening on port ${PORT}`);
});