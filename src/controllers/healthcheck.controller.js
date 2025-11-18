import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/*
HEALTH CHECK ENDPOINT
Purpose: Verify that the server and API are running correctly.
 */
const healthcheck = asyncHandler(async (req, res) => {
    // Basic healthcheck response
    // Optionally return server time + uptime for monitoring

    const healthData = {
        status: "ok",
        serverTime: new Date().toISOString(),
        uptimeInSeconds: process.uptime(),
    };

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                healthData,
                "Server is healthy."
            )
        );
});

export { healthcheck };
