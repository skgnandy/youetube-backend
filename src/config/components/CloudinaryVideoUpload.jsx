import React, { useState } from 'react';
import { Box, Button, Input, Label, Text } from '@adminjs/design-system';

const CloudinaryVideoUpload = (props) => {
    const { record, property, onChange } = props;
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');

    const currentValue = record.params[property.path];

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setError('');
        setProgress(0);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default');
        formData.append('resource_type', 'video');

        try {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    setProgress(Math.round((e.loaded / e.total) * 100));
                }
            });

            xhr.addEventListener('load', () => {
                const data = JSON.parse(xhr.responseText);
                if (data.secure_url) {
                    onChange(property.path, data.secure_url);
                    setUploading(false);
                } else {
                    setError('Upload failed');
                    setUploading(false);
                }
            });

            xhr.addEventListener('error', () => {
                setError('Upload error');
                setUploading(false);
            });

            xhr.open('POST', `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`);
            xhr.send(formData);
        } catch (err) {
            setError('Upload error: ' + err.message);
            setUploading(false);
        }
    };

    return (
        <Box>
            <Label>{property.label}</Label>

            <Input
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                disabled={uploading}
            />

            {uploading && (
                <Box mt="sm">
                    <Text>Uploading: {progress}%</Text>
                </Box>
            )}
            {error && <Text mt="sm" color="error">{error}</Text>}

            <Input
                type="text"
                value={currentValue || ''}
                onChange={(e) => onChange(property.path, e.target.value)}
                placeholder="Or paste Cloudinary URL directly"
                mt="default"
            />
        </Box>
    );
};

export default CloudinaryVideoUpload;