const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("./generated/prisma/client");
const port = process.env.PORT || "5000";
const app = express();
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { authenticate } = require("./middleware");
const JWT_SECRET = process.env.JWT_SECRET;
const cookieParser = require("cookie-parser");

const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app); // so the socket.io need raw http server
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

app.use(express.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cookieParser());

io.on("connection", (socket) => {
  console.log("client connected,", socket.id);
  socket.on("message", (msg) => {
    console.log("message received", msg);
    // socket.broadcast.emit("received-message", msg); /// to use to broadcast to all clients except the user who sennt it
    io.emit("message", msg); //sends to all including sneder
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

app.get("/", (req, res) => {
  return res
    .status(200)
    .json({ message: "backend connected and working as it should" });
});

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      res.status(409).json({ message: "Email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });
    res.status(201).json({ message: "user created successfully", user });
  } catch (error) {
    return res.status(500).json({ message: "some thing went wrong" });
  }
});

app.get("/getuserInfo", authenticate, async (req, res) => {
  console.log("user id, ", req.user.userId);
  const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
  console.log("use ris", user);
  if (!user) return res.status(404).json({ message: "user not found" });
  res.status(200).json({ message: { name: user.name, email: user.email } });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(req.body);
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    console.log(user);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: "invalid credentials" });
    }

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      {
        expiresIn: "5m",
      }
    );
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" }
    );
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: false, //for https protocol only
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    });
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return res.status(200).json({ message: "Login Successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/refresh-token", (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  try {
    const payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
    const newAccessToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_SECRET,
      {
        expiresIn: "5m",
      }
    );
    res.cookie("access_token", newAccessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      maxAge: 60 * 60 * 1000,
    });
    res.status(200).json({ message: "Access token refreshed" });
  } catch (error) {
    res.status(403).json({ message: "invalid or expired fresh token" });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("accessToken");
  res.clearCookie("refresh_token");
  return res.status(200).json({ message: "Logged out successfully" });
});

app.get("/blogs", authenticate, (req, res) => {
  return res.status(200).json({ message: "congrats you dit it" });
});

server.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
