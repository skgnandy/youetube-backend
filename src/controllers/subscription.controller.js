import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//TOGGLE SUBSCRIPTION (Subscribe or Unsubscribe)
const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid Channel ID");
    }

    if (String(req.user._id) === String(channelId)) {
        throw new ApiError(400, "You cannot subscribe to your own channel.");
    }

    const existingSubscription = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user._id,
    });

    if (!existingSubscription) {
        const newSubscription = await Subscription.create({
            subscriber: req.user._id,
            channel: channelId,
        });

        return res
            .status(200)
            .json(new ApiResponse(200, newSubscription, "Channel subscribed successfully."));
    }

    await existingSubscription.deleteOne();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Channel unsubscribed successfully."));
});

//GET SUBSCRIBERS OF A CHANNEL
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid Channel ID");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
            },
        },
        { $unwind: "$subscriberDetails" },
        {
            $project: {
                _id: 0,
                username: "$subscriberDetails.username",
                avatar: "$subscriberDetails.avatar",
                fullName: "$subscriberDetails.fullName",
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, subscribers, "Channel subscribers fetched successfully."));
});

//GET CHANNELS SUBSCRIBED BY A USER
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid Subscriber ID");
    }

    const channels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails",
            },
        },
        { $unwind: "$channelDetails" },
        {
            $project: {
                _id: 1,
                username: "$channelDetails.username",
                avatar: "$channelDetails.avatar",
                fullName: "$channelDetails.fullName",
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, channels, "Subscribed channels fetched successfully."));
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels,
};
