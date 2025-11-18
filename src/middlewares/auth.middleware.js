import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {

    const token =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
        throw new ApiError(401, "Unauthorized request");
    }

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            throw new ApiError(401, "Token expired, please login again");
        }
        if (err.name === "JsonWebTokenError") {
            throw new ApiError(401, "Invalid token");
        }
        throw new ApiError(401, "Could not verify token");
    }

    const user = await User.findById(decoded?._id).select(
        "-password -refreshToken"
    );

    if (!user) {
        throw new ApiError(401, "User not found");
    }

    req.user = user;
    next();
});