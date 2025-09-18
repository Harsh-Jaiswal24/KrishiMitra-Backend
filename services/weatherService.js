const axios = require("axios");
const { OPEN_METEO_BASE, TOMORROWIO_BASE, TOMORROWIO_API_KEY } = require("../utils/constants");

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

module.exports = { getWeatherDetails, getLongRangeForecast };
