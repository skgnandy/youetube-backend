import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";

//GET ALL VIDEOS (Paginated + Search + Sort)
const getAllVideos = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 10,
        query = "",
        sortBy = "createdAt",
        sortType = "desc"
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const matchStage = query ? { title: { $regex: query, $options: "i" } } : {};

    const pipeline = [
        { $match: matchStage },
        { $sort: { [sortBy]: sortType === "asc" ? 1 : -1 } },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "channel"
            }
        },
        { $unwind: "$channel" },
        {
            $project: {
                _id: 1,
                thumbnail: 1,
                title: 1,
                duration: 1,
                views: {
                    $cond: {
                        if: { $isArray: "$views" },
                        then: { $size: "$views" },
                        else: 0
                    }
                },
                isPublished: 1,
                "channel._id": 1,
                "channel.username": 1,
                "channel.avatar": 1,
                createdAt: 1
            }
        }
    ];

    const aggregate = Video.aggregate(pipeline);

    Video.aggregatePaginate(aggregate, { page: pageNum, limit: limitNum }, (err, result) => {
        if (err) throw new ApiError(500, err.message);
        return res.status(200).json(new ApiResponse(200, result, "All videos fetched"));
    });
});

//GET ALL USER VIDEOS
const getAllUserVideos = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query;

    if (!userId || !isValidObjectId(userId)) {
        throw new ApiError(400, "Valid userId is required");
    }

    page = parseInt(page);
    limit = parseInt(limit);

    const pipeline = [
        { $match: { owner: new mongoose.Types.ObjectId(userId) } },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "channel"
            }
        },
        { $unwind: "$channel" },
        {
            $match: query ? { title: { $regex: query, $options: "i" } } : {}
        },
        {
            $sort: { [sortBy]: sortType === "asc" ? 1 : -1 }
        },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
            $addFields: {
                views: {
                    $cond: {
                        if: { $isArray: "$views" },
                        then: { $size: "$views" },
                        else: 0
                    }
                }
            }
        },
        {
            $project: {
                "channel.password": 0,
                "channel.refreshToken": 0
            }
        }
    ];

    const result = await Video.aggregatePaginate(Video.aggregate(pipeline), { page, limit });

    return res
        .status(200)
        .json(new ApiResponse(200, result, "All user videos fetched"));
});

//PUBLISH A VIDEO
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title) throw new ApiError(400, "Title is required");

    const videoPath = req.files?.videoFile?.[0]?.path;
    if (!videoPath) throw new ApiError(400, "Video file is required");

    const thumbnailPath = req.files?.thumbnail?.[0]?.path || null;

    const videoUpload = await uploadOnCloudinary(videoPath);
    const thumbnailUpload = thumbnailPath ? await uploadOnCloudinary(thumbnailPath) : null;

    const video = await Video.create({
        videoFile: videoUpload.url,
        thumbnail: thumbnailUpload?.url || null,
        owner: req.user._id,
        title,
        description,
        duration: videoUpload.duration
    });

    return res
        .status(201)
        .json(new ApiResponse(201, video, "Video published successfully"));
});


//GET VIDEO BY ID + Update views + History
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid videoId");

    // Add unique view + History update
    await Promise.all([
        Video.findByIdAndUpdate(videoId, { $addToSet: { views: req.user._id } }),
        User.findByIdAndUpdate(req.user._id, { $addToSet: { watchHistory: videoId } })
    ]);

    const pipeline = [
        { $match: { _id: new mongoose.Types.ObjectId(videoId) } },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "channel"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "owner",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        { $unwind: "$channel" },
        {
            $addFields: {
                views: { $size: "$views" },
                likesCount: { $size: "$likes" },
                "channel.subscribersCount": { $size: "$subscribers" },
                "channel.isSubscribed": {
                    $in: [req.user._id, "$subscribers.subscriber"]
                }
            }
        }
    ];

    const video = await Video.aggregate(pipeline);

    return res.status(200).json(new ApiResponse(200, video[0], "Video details fetched"));
});

//UPDATE VIDEO (title, description, thumbnail)
const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid videoId");

    const { title, description } = req.body;

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    let updateObj = {};

    if (title) updateObj.title = title;
    if (description) updateObj.description = description;

    // Thumbnail update
    if (req.files?.thumbnail?.[0]?.path) {
        await deleteFromCloudinary(video.thumbnail);
        const newThumb = await uploadOnCloudinary(req.files.thumbnail[0].path);
        updateObj.thumbnail = newThumb.url;
    }

    const updated = await Video.findByIdAndUpdate(videoId, { $set: updateObj }, { new: true });

    return res.status(200).json(new ApiResponse(200, updated, "Video updated successfully"));
});

//DELETE VIDEO + Remove From Cloudinary
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid videoId");

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    // Delete from cloudinary
    await deleteFromCloudinary(video.videoFile);
    await deleteFromCloudinary(video.thumbnail);

    await Video.findByIdAndDelete(videoId);

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

//TOGGLE PUBLISH STATUS
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid videoId");

    const video = await Video.findById(videoId);
    if (!video) throw new ApiError(404, "Video not found");

    video.isPublished = !video.isPublished;
    await video.save();

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Publish status updated"));
});


export {
    getAllVideos,
    getAllUserVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
};
