import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";
import errorHandler from "./middlewares/errorHandler.middleware.js";
import authRouter from "./routes/auth.route.js";

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(express.json({limit:'10mb'}));
app.use(express.urlencoded({extended:true, limit: '10mb'}));
app.use(cookieParser());

//health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: 'v1' });
});

// auth routes
app.use('/api/v1/auth', authRouter);

// 404 handler
app.use((req, res)=> {
  res.status(404).json({
    success: false,
    message: "Route not found"
  })
})

// error handling middleware
app.use(errorHandler);
export {app};