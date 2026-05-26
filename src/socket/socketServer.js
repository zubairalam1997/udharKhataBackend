import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../db/db.config.js";

let io;

const getAllowedOrigins = () => {
  const origin = process.env.CORS_ORIGIN || "*";
  return origin === "*" ? "*" : origin.split(",").map((item) => item.trim());
};

export const initSocketServer = (server) => {
  io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const userIdFromClient = socket.handshake.auth?.userId;

      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          select: { id: true },
        });

        if (!user) {
          return next(new Error("Invalid socket user"));
        }

        socket.userId = user.id;
        return next();
      }

      if (userIdFromClient) {
        const user = await prisma.user.findUnique({
          where: { id: userIdFromClient },
          select: { id: true },
        });

        if (!user) {
          return next(new Error("Invalid socket user"));
        }

        socket.userId = user.id;
        return next();
      }

      return next(new Error("Socket authentication required"));
    } catch (error) {
      return next(new Error(error?.message || "Socket authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.userId}`);
    console.log(`Socket connected for user: ${socket.userId}`);
    socket.emit("socket:ready", { userId: socket.userId });

    socket.on("disconnect", (reason) => {
      console.log(`Socket disconnected for user: ${socket.userId}. Reason: ${reason}`);
    });
  });

  return io;
};

export const getSocketServer = () => io;

export const emitToUser = (userId, event, payload) => {
  if (!io || !userId) {
    return;
  }

  io.to(`user:${userId}`).emit(event, payload);
};
