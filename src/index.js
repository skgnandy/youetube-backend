import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import setupAdminPanel from "./config/admin.config.js";

dotenv.config({ path: "./.env" });

const startServer = async () => {
    try {
        // 1️⃣ Connect MongoDB
        await connectDB();
        console.log("✅ MongoDB connected");

        const PORT = process.env.PORT || 8000;

        // 2️⃣ Setup AdminJS
        const { adminJs, adminRouter } = await setupAdminPanel();
        app.use(adminJs.options.rootPath, adminRouter);

        console.log(
            `🔧 AdminJS ready at http://localhost:${PORT}${adminJs.options.rootPath}`
        );

        // 3️⃣ Start Express Server
        app.listen(PORT, () =>
            console.log(`⚙️ Server running on http://localhost:${PORT}`)
        );

    } catch (error) {
        console.error("❌ Startup failed:", error.message);
        console.error(error);
        process.exit(1);
    }
};

startServer();