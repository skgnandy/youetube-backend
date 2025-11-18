import React from 'react';
import { Box, Label } from '@adminjs/design-system';

const CloudinaryShow = (props) => {
    const { record, property } = props;
    const value = record.params[property.path];

    if (!value) return null;

    const isVideo = value.includes('/video/') || value.match(/\.(mp4|webm|mov)$/i);

    return (
        <Box>
            <Label>{property.label}</Label>
            {isVideo ? (
                <video controls style={{ maxWidth: '100%', maxHeight: '400px' }}>
                    <source src={value} />
                </video>
            ) : (
                <img src={value} alt={property.label} style={{ maxWidth: '100%', maxHeight: '400px' }} />
            )}
            <Box mt="sm">
                <a href={value} target="_blank" rel="noopener noreferrer">Open in new tab</a>
            </Box>
        </Box>
    );
};

export default CloudinaryShow;