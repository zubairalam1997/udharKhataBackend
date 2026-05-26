import dotenv from "dotenv";
import http from "http";

dotenv.config();

import {app} from "./app.js";
import { initSocketServer } from "./socket/socketServer.js";

const server = http.createServer(app);

initSocketServer(server);

server.listen(process.env.PORT, ()=>{
    console.log(`Server running on port: ${process.env.PORT}`);
});
