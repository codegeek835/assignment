const express = require("express");
const userRoutes = require("./routes/users");
const alertsRoutes = require("./routes/alerts");
const { errorHandler } = require("./middleware/errorHandler");
const { attachSwagger } = require("./docs/swagger");

const app = express();

app.use(express.json());

attachSwagger(app);

app.use(alertsRoutes);
app.use(userRoutes);

app.use(errorHandler);

module.exports = { app };
