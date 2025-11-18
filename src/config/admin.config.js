import fs from 'fs';
import path from 'path';
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import * as AdminJSMongoose from '@adminjs/mongoose';
import mongoose from 'mongoose';

// Register adapter
AdminJS.registerAdapter({
    Resource: AdminJSMongoose.Resource,
    Database: AdminJSMongoose.Database,
});

// ✅ Optional custom config per model (icon, group, fields, etc.)
const modelConfig = {
    User: {
        nav: { name: 'User Management', icon: 'User' },
        properties: {
            password: { isVisible: { list: false, filter: false, show: false, edit: true }, type: 'password' },
            refreshToken: { isVisible: false },
            avatar: { type: 'string', isVisible: { list: true, filter: false, show: true, edit: true } },
            coverImage: { type: 'string', isVisible: { list: false, filter: false, show: true, edit: true } },
        },
    },
    Video: {
        nav: { name: 'Content', icon: 'Video' },
        properties: {
            description: { type: 'textarea' },
            thumbnail: { type: 'string' },
            videoFile: { type: 'string' },
        },
    },
    Tweet: {
        nav: { name: 'Content', icon: 'MessageSquare' },
        properties: { content: { type: 'textarea' } },
    },
    Comment: {
        nav: { name: 'Engagement', icon: 'MessageCircle' },
        properties: { content: { type: 'textarea' } },
    },
    Like: { nav: { name: 'Engagement', icon: 'Heart' } },
    Playlist: {
        nav: { name: 'Content', icon: 'List' },
        properties: {
            description: { type: 'textarea' },
            thumbnail: { type: 'string' },
        },
    },
    Subscription: { nav: { name: 'User Management', icon: 'Users' } },
};

// ✅ Dynamically import all models in /models
const loadAllModels = async () => {
    const modelsDir = path.resolve('src/models');
    const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));
    const loaded = {};

    for (const file of files) {
        const modulePath = path.join(modelsDir, file);
        const module = await import(`file://${modulePath}`);
        Object.entries(module).forEach(([name, model]) => {
            if (mongoose.models[name]) {
                loaded[name] = mongoose.models[name];
            } else if (model?.modelName) {
                loaded[name] = model;
            }
        });
    }

    return loaded;
};

const setupAdminPanel = async () => {
    const models = await loadAllModels();

    // Auto-register all models with optional overrides
    const resources = Object.entries(models).map(([name, model]) => ({
        resource: model,
        options: {
            navigation: modelConfig[name]?.nav || { name: 'Other', icon: 'Box' },
            properties: {
                __v: { isVisible: false },
                ...(modelConfig[name]?.properties || {}),
            },
        },
    }));

    const adminJs = new AdminJS({
        resources,
        rootPath: '/admin',
        branding: {
            companyName: 'YouTube Platform Admin',
            logo: false,
            softwareBrothers: false,
            theme: {
                colors: {
                    primary100: '#4F46E5',
                    primary80: '#6366F1',
                    primary60: '#818CF8',
                },
            },
        },
        locale: {
            language: 'en',
            translations: {
                en: {
                    messages: { loginWelcome: 'YouTube Platform Admin' },
                    properties: {
                        avatar: 'Avatar (Cloudinary URL)',
                        coverImage: 'Cover Image (Cloudinary URL)',
                        thumbnail: 'Thumbnail (Cloudinary URL)',
                        videoFile: 'Video File (Cloudinary URL)',
                    },
                },
            },
        },
    });

    // Authenticated admin panel
    const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
        adminJs,
        {
            authenticate: async (email, password) => {
                try {
                    const User = mongoose.models.User;
                    if (!User) throw new Error('User model not found');
                    const user = await User.findOne({ email });
                    if (!user) return false;

                    const isValid = await user.isPasswordCorrect(password);
                    if (!isValid) return false;

                    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
                    if (adminEmails.length > 0 && !adminEmails.includes(email)) return false;

                    return {
                        email: user.email,
                        id: user._id.toString(),
                        title: user.fullName,
                        avatarUrl: user.avatar,
                    };
                } catch (error) {
                    console.error('❌ Admin authentication error:', error.message);
                    return false;
                }
            },
            cookiePassword: process.env.ADMIN_COOKIE_SECRET || 'secret-min-32-chars-long',
        },
        null,
        {
            resave: false,
            saveUninitialized: true,
            secret: process.env.ADMIN_COOKIE_SECRET || 'secret-min-32-chars-long',
            cookie: {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 1000 * 60 * 60 * 24,
            },
            name: 'adminjs',
        }
    );

    return { adminJs, adminRouter };
};

export default setupAdminPanel;
