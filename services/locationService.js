const axios = require("axios");

async function getLocationDetails(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const { data } = await axios.get(url, { timeout: 10000 });
    return data;
  } catch (err) {
    console.error("Location API failed:", err.message);
    return { error: "Location data unavailable" };
  }
}

module.exports = { getLocationDetails };
