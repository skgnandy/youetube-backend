import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const router = Router();

// Admin-only quick upload endpoint
router.post("/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const result = await uploadOnCloudinary(req.file.path);

        if (!result) {
            return res.status(500).json({ error: "Upload failed" });
        }

        res.json({
            success: true,
            url: result.secure_url || result.url,
            publicId: result.public_id,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;