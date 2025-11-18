import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//Utility Function: Toggle Like
//Works for video, comment, tweet by passing key dynamically
const toggleLike = async (req, res, typeKey, typeId, successMsg) => {
    if (!isValidObjectId(typeId)) {
        throw new ApiError(400, `Invalid ${typeKey} ID`);
    }

    const filter = { [typeKey]: typeId, likedBy: req.user._id };

    const existingLike = await Like.findOne(filter);

    // If not liked → create like
    if (!existingLike) {
        const like = await Like.create(filter);

        return res
            .status(200)
            .json(new ApiResponse(200, like, `Liked the ${successMsg}`));
    }

    // Otherwise remove like
    await existingLike.deleteOne();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, `Unliked the ${successMsg}`));
};

//Toggle Like on Video
const toggleVideoLike = asyncHandler(async (req, res) => {
    await toggleLike(req, res, "video", req.params.videoId, "Video");
});

//Toggle Like on Comment
const toggleCommentLike = asyncHandler(async (req, res) => {
    await toggleLike(req, res, "comment", req.params.commentId, "Comment");
});

//Toggle Like on Tweet
const toggleTweetLike = asyncHandler(async (req, res) => {
    await toggleLike(req, res, "tweet", req.params.tweetId, "Tweet");
});

//Get All Liked Videos by User
const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid or missing User ID.");
    }

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(userId),
                video: { $exists: true },
            },
        },

        // Join video details
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "videoDetails",
            },
        },

        // Join user/channel info
        {
            $lookup: {
                from: "users",
                localField: "likedBy",
                foreignField: "_id",
                as: "channel",
            },
        },

        { $unwind: "$videoDetails" },

        // Extract required data only
        {
            $project: {
                _id: 0,
                likedAt: "$createdAt",
                videoDetails: 1,
                channel: {
                    username: {
                        $arrayElemAt: ["$channel.username", 0],
                    },
                    avatar: {
                        $arrayElemAt: ["$channel.avatar", 0],
                    },
                },
            },
        },
    ]);

    if (!likedVideos) {
        throw new ApiError(500, "Failed to fetch liked videos.");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, likedVideos, "Fetched all liked videos successfully.")
        );
});

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos,
};
