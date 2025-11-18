import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//CREATE PLAYLIST
const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        throw new ApiError(400, "Playlist name is required.");
    }

    const playlist = await Playlist.create({
        name,
        description: description || "",
        owner: req.user._id,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, playlist, "Playlist created successfully."));
});

//GET USER PLAYLISTS
const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid User ID");
    }

    const userPlaylists = await Playlist.find({ owner: userId }).populate({
        path: "videos",
        select: "thumbnail",
    });

    return res
        .status(200)
        .json(new ApiResponse(200, userPlaylists, "User playlists fetched."));
});

//GET PLAYLIST BY ID (AGGREGATION)
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(playlistId) },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        },
                    },
                ],
            },
        },
        { $unwind: "$owner" },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    { $unwind: "$owner" },
                    {
                        $addFields: {
                            views: {
                                $cond: {
                                    if: { $isArray: "$views" },
                                    then: { $size: "$views" },
                                    else: 0,
                                },
                            },
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            owner: 1,
                            createdAt: 1,
                        },
                    },
                ],
            },
        },
    ]);

    if (!playlist.length) {
        throw new ApiError(404, "Playlist not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist[0], "Playlist fetched."));
});

//ADD VIDEO TO PLAYLIST
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Playlist ID or Video ID");
    }

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: { videos: videoId }, // prevents duplicates
        },
        { new: true }
    );

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Video added to playlist."));
});

//REMOVE VIDEO FROM PLAYLIST
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid Playlist ID or Video ID");
    }

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: { videos: videoId },
        },
        { new: true }
    );

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Video removed from playlist."));
});

//DELETE PLAYLIST
const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID");
    }

    const playlist = await Playlist.findByIdAndDelete(playlistId);

    if (!playlist) {
        throw new ApiError(404, "Playlist not found or already deleted");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist deleted successfully."));
});

//UPDATE PLAYLIST
const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID");
    }

    if (!name && !description) {
        throw new ApiError(400, "Nothing to update");
    }

    const playlist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                ...(name && { name }),
                ...(description && { description }),
            },
        },
        { new: true }
    );

    if (!playlist) {
        throw new ApiError(404, "Playlist not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "Playlist updated successfully."));
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
};
