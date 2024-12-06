import express from "express";
import errorMiddleware from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import { config } from "dotenv";
import cors from "cors";
import morgan from "morgan";
import productRoutes from "./routes/product.routes.js"
import authRoutes from "./routes/auth.routes.js"
import orderRoutes from "./routes/order.routes.js"
import { formatDate } from "./utils/date.js";

// Load environment variables
config();

const app = express();


// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(cors({
  origin: ["*","http://localhost:3000", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "DELETE", "PUT"],
}));
app.use(morgan("dev"));

// Routes
app.use("/api/v1/product", productRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/order", orderRoutes);




// Function to format the date


app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to Student Tiffin Backend ",
    author: "NeonShark",
    date: formatDate(new Date()), // Formatted date
    // Dynamic health status
  });
});


// Error handling middleware
app.use(errorMiddleware);

export default app;
