// import { Server } from "socket.io";
// import http from "http";
// import express from "express";

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: { origin: "*" }
// });

// io.on("connection", (socket) => {
//   console.log("✅ Client connected:", socket.id);

//   socket.on("ping", (data) => {
//     console.log("📩 Got ping:", data);
//     socket.emit("pong", { msg: "Hello client" });
//   });

//   socket.on("disconnect", () => {
//     console.log("❌ Client disconnected:", socket.id);
//   });
// });

// server.listen(5000, () => {
//   console.log("🚀 Backend running on http://localhost:5000");
// });
