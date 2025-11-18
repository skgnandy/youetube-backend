class ApiResponse {
    constructor(statusCode, data = null, message = "Success") {
        this.statusCode = statusCode;
        this.success = statusCode < 400;
        this.message = message;
        this.data = data;
        this.timestamp = new Date().toISOString();
    }

    // Optional: convert to JSON cleanly
    toJSON() {
        return {
            success: this.success,
            message: this.message,
            data: this.data,
            timestamp: this.timestamp,
        };
    }
}

export { ApiResponse };
