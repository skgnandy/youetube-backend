import React, { useState } from 'react';
import { Box, Button, Input, Label, Text } from '@adminjs/design-system';

const CloudinaryUpload = (props) => {
    const { record, property, onChange } = props;
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const currentValue = record.params[property.path];

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', process.env.CLOUDINARY_UPLOAD_PRESET || 'ml_default');

        try {
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/auto/upload`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            const data = await response.json();

            if (data.secure_url) {
                onChange(property.path, data.secure_url);
            } else {
                setError('Upload failed');
            }
        } catch (err) {
            setError('Upload error: ' + err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Box>
            <Label>{property.label}</Label>

            {currentValue && (
                <Box mb="default">
                    <img src={currentValue} alt="Current" style={{ maxWidth: '200px', maxHeight: '200px' }} />
                </Box>
            )}

            <Input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
            />

            {uploading && <Text mt="sm">Uploading...</Text>}
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

export default CloudinaryUpload;