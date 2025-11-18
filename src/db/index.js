import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is missing from environment variables");
        }

        const mongoUri = `${process.env.MONGODB_URI}/${DB_NAME}`;

        const connectionInstance = await mongoose.connect(mongoUri);

        console.log(`\n✅ MongoDB connected`);
        console.log(`📌 DB Host: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.error("❌ MongoDB connection FAILED");
        console.error(error.message);
        process.exit(1);
    }
};

export default connectDB;
