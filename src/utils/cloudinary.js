import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const safeUnlink = (path) => {
    if (path && fs.existsSync(path)) {
        try {
            fs.unlinkSync(path);
        } catch (_) { }
    }
};

const uploadOnCloudinary = async (localFilePath) => {
    if (!localFilePath) return null;

    try {
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        safeUnlink(localFilePath);
        return response;

    } catch (error) {
        safeUnlink(localFilePath);
        return null;
    }
};

const deleteFromCloudinary = async (publicId) => {
    try {
        return await cloudinary.uploader.destroy(publicId);
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error.message);
        return null;
    }
};

export { uploadOnCloudinary, deleteFromCloudinary };
