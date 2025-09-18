const axios = require("axios");
const { SOILGRIDS_PROPERTIES_URL, SOILGRIDS_CLASSIFICATION_URL, soilProperties, soilDepths, soilValues } = require("../utils/constants");

async function getSoilDetails(lat, lon) {
  const params = new URLSearchParams();
  params.append("lon", lon);
  params.append("lat", lat);
  soilProperties.forEach((p) => params.append("property", p));
  soilDepths.forEach((d) => params.append("depth", d));
  soilValues.forEach((v) => params.append("value", v));

  try {
    const url = `${SOILGRIDS_PROPERTIES_URL}?${params.toString()}`;
    const { data } = await axios.get(url);
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
    const { data } = await axios.get(url);
    return data;
  } catch (e) {
    console.error("SoilGrids Classification API failed:", e.message);
    return { error: "Soil classification data temporarily unavailable" };
  }
}

module.exports = { getSoilDetails, getSoilClassification };
