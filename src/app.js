import express from "express";
import errorHandler from "./middlewares/errorHandler.middleware.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));





app.use(errorHandler);
export {app};