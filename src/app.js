import express from "express";
import cookieParser from "cookie-parser";
import errorHandler from "./middlewares/errorHandler.middleware.js";
import authRouter from "./routes/auth.route.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: 'v1' });
});


app.use('/api/v1/auth', authRouter);



app.use(errorHandler);
export {app};