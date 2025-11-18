// db.config.js

// Prefer environment DB name → fallback to default
export const DB_NAME = process.env.DB_NAME?.trim() || "videotube";

// Optional: Validate DB name
if (!DB_NAME.match(/^[a-zA-Z0-9-_]+$/)) {
    throw new Error(`❌ Invalid DB_NAME "${DB_NAME}". Use only letters, numbers, hyphens, or underscores.`);
}
