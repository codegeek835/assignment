import express from "express";
import userRoutes from "./routes/users.js";
import alertsRoutes from "./routes/alerts.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { attachSwagger } from "./docs/swagger.js";

const app = express();

app.use(express.json());

attachSwagger(app);

app.use(alertsRoutes);
app.use(userRoutes);

app.use(errorHandler);

export { app };
