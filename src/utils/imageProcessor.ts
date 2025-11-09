import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

export interface OptimizedImages {
  original: string;
  thumbnail: string;
}

export const optimizeImage = async (filepath: string): Promise<OptimizedImages> => {
  try {
    const ext = path.extname(filepath);
    const originalPath = filepath.replace(ext, '.webp');
    const thumbPath = filepath.replace(ext, '-thumb.webp');

    // Optimize full-size image
    await sharp(filepath)
      .resize(1920, 1080, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toFile(originalPath);

    // Generate thumbnail
    await sharp(filepath)
      .resize(400, 300, {
        fit: 'cover',
      })
      .webp({ quality: 80 })
      .toFile(thumbPath);

    // Delete original file if it's not already .webp
    if (ext !== '.webp') {
      await fs.unlink(filepath);
    }

    return {
      original: originalPath,
      thumbnail: thumbPath,
    };
  } catch (error) {
    console.error('Error optimizing image:', error);
    throw new Error('Failed to optimize image');
  }
};

export const deleteImage = async (filepath: string): Promise<void> => {
  try {
    await fs.unlink(filepath);
    
    // Try to delete thumbnail
    const ext = path.extname(filepath);
    const thumbPath = filepath.replace(ext, '-thumb.webp');
    try {
      await fs.unlink(thumbPath);
    } catch {
      // Thumbnail might not exist, ignore error
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new Error('Failed to delete image');
  }
};
