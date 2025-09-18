const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";
const TOMORROWIO_BASE = "https://api.tomorrow.io/v4/weather/forecast";
const TOMORROWIO_API_KEY = process.env.TOMORROWIO_API_KEY;

const SOILGRIDS_PROPERTIES_URL = "https://rest.isric.org/soilgrids/v2.0/properties/query";
const SOILGRIDS_CLASSIFICATION_URL = "https://rest.isric.org/soilgrids/v2.0/classification/query";

const soilProperties = ["bdod", "cec", "cfvo", "clay", "nitrogen", "ocd", "ocs", "phh2o", "sand", "silt", "soc", "wv0010", "wv0033", "wv1500"];
const soilDepths = ["0-5cm", "0-30cm", "5-15cm", "15-30cm", "30-60cm", "60-100cm", "100-200cm"];
const soilValues = ["Q0.05", "Q0.5", "Q0.95", "mean", "uncertainty"];

module.exports = {
  OPEN_METEO_BASE,
  TOMORROWIO_BASE,
  TOMORROWIO_API_KEY,
  SOILGRIDS_PROPERTIES_URL,
  SOILGRIDS_CLASSIFICATION_URL,
  soilProperties,
  soilDepths,
  soilValues,
};
