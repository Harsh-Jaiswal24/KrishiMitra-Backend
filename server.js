const express = require("express");
require("dotenv").config();

const recommendationRoutes = require("./routes/recommendationRoutes");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Routes
app.use("/recommendation", recommendationRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
