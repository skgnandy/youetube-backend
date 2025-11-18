import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//CREATE TWEET
const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Content is required.");
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user._id,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

//GET USER TWEETS
const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User ID");
    }

    const tweets = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(userId) },
        },
        {
            $lookup: {
                from: "tweets",
                localField: "_id",
                foreignField: "owner",
                as: "tweets",
            },
        },
        { $unwind: "$tweets" },
        {
            $lookup: {
                from: "likes",
                let: { tweetId: "$tweets._id" },
                pipeline: [
                    { $match: { $expr: { $eq: ["$tweet", "$$tweetId"] } } },
                    { $count: "count" },
                ],
                as: "likesCount",
            },
        },
        {
            $addFields: {
                "tweets.likesCount": {
                    $ifNull: [{ $arrayElemAt: ["$likesCount.count", 0] }, 0],
                },
            },
        },
        {
            $group: {
                _id: "$_id",
                fullName: { $first: "$fullName" },
                username: { $first: "$username" },
                email: { $first: "$email" },
                avatar: { $first: "$avatar" },
                tweets: { $push: "$tweets" },
            },
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                tweets: 1,
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
});

//UPDATE TWEET
const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { newContent } = req.body;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID");
    }

    if (!newContent || newContent.trim().length === 0) {
        throw new ApiError(400, "Content cannot be empty");
    }

    const tweet = await Tweet.findOneAndUpdate(
        { _id: tweetId, owner: req.user._id }, // prevent others editing tweet
        { $set: { content: newContent } },
        { new: true }
    );

    if (!tweet) {
        throw new ApiError(404, "Tweet not found or unauthorized");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

//DELETE TWEET
const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid Tweet ID");
    }

    const tweet = await Tweet.findOneAndDelete({
        _id: tweetId,
        owner: req.user._id, // ensure user can delete only their own tweets
    });

    if (!tweet) {
        throw new ApiError(404, "Tweet not found or unauthorized");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
