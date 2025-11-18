import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

/*
GET CHANNEL STATS
(Total Views, Subscribers, Video Count, Likes, etc.)
 */
const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    // Validate ObjectId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid or missing userId.");
    }

    const stats = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(userId),
            },
        },

        // Get all videos of this channel
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "owner",
                as: "videos",
            },
        },

        // Get all subscribers for this channel
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },

        // Join likes for all channel videos
        {
            $lookup: {
                from: "likes",
                let: { videoIds: "$videos._id" },
                pipeline: [
                    {
                        $match: {
                            $expr: { $in: ["$video", "$$videoIds"] },
                        },
                    },
                ],
                as: "likes",
            },
        },

        // Add computed fields
        {
            $addFields: {
                totalVideos: { $size: "$videos" },
                totalSubscribers: { $size: "$subscribers" },
                totalLikes: { $size: "$likes" },

                totalViews: {
                    $sum: {
                        $map: {
                            input: "$videos",
                            as: "v",
                            in: {
                                $cond: {
                                    if: { $isArray: "$$v.views" },
                                    then: { $size: "$$v.views" },
                                    else: { $ifNull: ["$$v.views", 0] },
                                },
                            },
                        },
                    },
                },
            },
        },

        // Limit returned fields
        {
            $project: {
                username: 1,
                totalVideos: 1,
                totalLikes: 1,
                totalViews: 1,
                totalSubscribers: 1,
                "videos._id": 1,
                "videos.title": 1,
                "videos.thumbnail": 1,
                "videos.description": 1,
                "videos.isPublished": 1,
                "videos.createdAt": 1,
            },
        },
    ]);

    // Aggregation returns array → must check empty array, not null
    if (!stats || stats.length === 0) {
        throw new ApiError(404, "Channel stats not found.");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, stats[0], "Channel stats fetched successfully.")
        );
});

//GET ALL VIDEOS OF THE CHANNEL
const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Invalid or missing userId.");
    }

    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },

        // Convert `views` array → count
        {
            $addFields: {
                viewsCount: {
                    $cond: {
                        if: { $isArray: "$views" },
                        then: { $size: "$views" },
                        else: { $ifNull: ["$views", 0] },
                    },
                },
            },
        },

        {
            $project: {
                title: 1,
                thumbnail: 1,
                isPublished: 1,
                description: 1,
                createdAt: 1,
                viewsCount: 1,
            },
        },
    ]);

    if (!videos) {
        throw new ApiError(500, "Failed to fetch channel videos.");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, videos, "Channel videos fetched successfully.")
        );
});

export { getChannelStats, getChannelVideos };
