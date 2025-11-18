class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message)
        this.statusCode = statusCode
        this.data = null
        this.message = message
        this.success = false;
        this.errors = errors

        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }

    }
    // Standardized JSON structure
    toJSON() {
        return {
            success: this.success,
            message: this.message,
            errors: this.errors,
            statusCode: this.statusCode,

        };
    }

    // 👇 Optional helper to use as Express middleware
    static handler(err, req, res, next) {
        //console.error("🔥 Error caught by middleware:", err);

        if (err instanceof ApiError) {
            return res.status(err.statusCode).json(err.toJSON());
        }

        return res.status(500).json({
            success: false,
            message: err.message || "Internal Server Error",
            stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
        });
    }

}


export { ApiError }