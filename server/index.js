import express from "express";
import fileUpload from "express-fileupload";
import cors from "cors";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import http from "http";
import { Server } from "socket.io";

dotenv.config();
const app = express();
const server = http.createServer(app); // For socket.io

// Create uploads folder if it doesn't exist
const UPLOAD_DIR = path.resolve("uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

// Middleware
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use(fileUpload());

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

// POST /upload route
app.post("/upload", async (req, res) => {
  try {
    if (!req.files?.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.files.file;
    const filePath = path.join(UPLOAD_DIR, `${Date.now()}-${file.name}`);
    await file.mv(filePath);

    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "video",
    });

    fs.unlinkSync(filePath); // Delete local file
    res.json({ url: result.secure_url });
  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// 🔌 WebSocket (Socket.IO) setup
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`👥 User ${socket.id} joined room ${roomId}`);
    socket.to(roomId).emit("guest-joined", { id: socket.id });

    // WebRTC: Offer
    socket.on("offer", ({ to, offer }) => {
      io.to(to).emit("offer", { from: socket.id, offer });
    });

    // WebRTC: Answer
    socket.on("answer", ({ to, answer }) => {
      io.to(to).emit("answer", { from: socket.id, answer });
    });

    // WebRTC: ICE Candidate
    socket.on("ice-candidate", ({ to, candidate }) => {
      io.to(to).emit("ice-candidate", { from: socket.id, candidate });
    });
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// Start server
server.listen(5000, () => {
  console.log("🚀 Server + Socket.IO running on http://localhost:5000");
});
