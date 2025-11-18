import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import setupAdminPanel from "./config/admin.config.js";
import { ApiError } from "./utils/ApiError.js";

const app = express();

// Core middlewares
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

// Setup Admin Panel routes
const { adminJs, adminRouter } = await setupAdminPanel();
app.use(adminJs.options.rootPath, adminRouter);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Route imports
import adminUploadRoutes from "./routes/admin.routes.js";
import userRouter from "./routes/user.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js";
import tweetRouter from "./routes/tweet.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import likeRouter from "./routes/like.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";

// Route declarations
app.use("/api/v1/admin", adminUploadRoutes);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/dashboard", dashboardRouter);

// Global error handler
app.use(ApiError.handler);

export { app };
