import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";

//GET VIDEO COMMENTS — PAGINATED + USER INFO
const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate videoId
    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid or missing videoId.");
    }

    // Optional: Check that video exists
    const videoExists = await Video.findById(videoId);
    if (!videoExists) {
        throw new ApiError(404, "Video not found.");
    }

    const options = { page, limit };

    // Aggregation pipeline to get comments + owner details
    const commentsPipeline = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "commentor",
            },
        },
        {
            $unwind: "$commentor",
        },
        {
            $project: {
                _id: 1,
                content: 1,
                "commentor._id": 1,
                "commentor.username": 1,
                "commentor.fullName": 1,
                "commentor.avatar": 1,
                "commentor.createdAt": 1,
            },
        },
    ]);

    Comment.aggregatePaginate(commentsPipeline, options, (err, results) => {
        if (err) {
            console.error("Comment aggregation error:", err);
            return res
                .status(500)
                .json(
                    new ApiError(
                        500,
                        "Failed to fetch comments due to server error."
                    )
                );
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    results,
                    "Comments fetched successfully."
                )
            );
    });
});

//ADD COMMENT TO A VIDEO
const addComment = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const { videoId } = req.params;
    const userId = req.user?._id;

    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Comment content cannot be empty.");
    }

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid or missing videoId.");
    }

    // Ensure user exists in request (from auth middleware)
    if (!userId) {
        throw new ApiError(401, "Unauthorized: User info missing.");
    }

    // Ensure video exists before commenting
    const videoExists = await Video.findById(videoId);
    if (!videoExists) {
        throw new ApiError(404, "Video not found.");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: userId,
    });

    return res
        .status(201)
        .json(
            new ApiResponse(201, comment, "Comment added successfully.")
        );
});

//UPDATE COMMENT
const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { updatedContent } = req.body;

    if (!updatedContent || updatedContent.trim().length === 0) {
        throw new ApiError(400, "Updated content cannot be empty.");
    }

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid or missing commentId.");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { $set: { content: updatedContent } },
        { new: true }
    );

    if (!updatedComment) {
        throw new ApiError(404, "Comment not found.");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedComment, "Comment updated successfully.")
        );
});

//DELETE COMMENT
const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Invalid or missing commentId.");
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId);

    if (!deletedComment) {
        throw new ApiError(404, "Comment not found.");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, deletedComment, "Comment deleted successfully.")
        );
});

export { getVideoComments, addComment, updateComment, deleteComment };
