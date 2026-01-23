import * as path from 'path';
import * as fs from 'fs/promises';
import sharp from 'sharp';

export interface OptimizedImage {
  url: string;
  thumbnailUrl?: string;
}

const getUploadDir = (): string => {
  return process.env.NODE_ENV === 'production' 
    ? (process.env.UPLOAD_DIR || '/app/uploads')
    : path.join(__dirname, '../../uploads');
};

// Simple image processing that creates only ONE optimized image
export const processImage = async (filepath: string, maxWidth: number = 1200, maxHeight: number = 900): Promise<string> => {
  try {
    console.log('Processing image:', filepath);
    
    const filename = path.basename(filepath, path.extname(filepath));
    const uploadDir = getUploadDir();
    
    // Single optimized filename
    const optimizedName = `${filename}_opt.webp`;
    const optimizedPath = path.join(uploadDir, optimizedName);
    
    // Read and process image
    const imageBuffer = await fs.readFile(filepath);
    const image = sharp(imageBuffer);
    
    // Get metadata
    const metadata = await image.metadata();
    console.log(`Original: ${metadata.width}x${metadata.height}, ${metadata.format}`);
    
    // Create single optimized image
    await image
      .resize(maxWidth, maxHeight, { 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .webp({ quality: 85 })
      .toFile(optimizedPath);
    
    // Remove original unoptimized file
    await fs.unlink(filepath);
    
    console.log('Image processing completed');
    
    return `/uploads/${optimizedName}`;
    
  } catch (error) {
    console.error('Image processing failed:', error);
    
    // Fallback: just move original file
    try {
      const filename = path.basename(filepath);
      const fallbackPath = path.join(getUploadDir(), filename);
      await fs.rename(filepath, fallbackPath);
      
      return `/uploads/${filename}`;
    } catch (fallbackError) {
      console.error('Fallback failed:', fallbackError);
      throw error;
    }
  }
};

// Legacy optimizeImage function for backward compatibility - now uses single image
export const optimizeImage = async (filepath: string): Promise<{ original: string; thumbnail: string }> => {
  const result = await processImage(filepath);
  return {
    original: result,
    thumbnail: result
  };
};

// Enhanced deleteImage that handles multiple potential filenames
export const deleteImage = async (imagePath: string): Promise<void> => {
  if (!imagePath) return;
  
  try {
    const uploadDir = getUploadDir();
    
    // Remove leading slash and 'uploads/' from path
    const cleanPath = imagePath.replace(/^\/uploads\//, '');
    
    // Get base filename without extension
    const filename = path.basename(cleanPath, path.extname(cleanPath));
    
    // Potential filenames to delete (covers old multi-image system)
    const potentialFiles = [
      cleanPath,                              // Original file
      `${filename}_opt.webp`,                 // New single optimized
      `${filename}_original.jpg`,             // Old original
      `${filename}_thumb.webp`,               // Old thumbnail
      `${filename}_medium.webp`,              // Old medium
      `${filename}_large.webp`,               // Old large
      `${filename}_team.jpg`,                 // Team photo
    ];
    
    // Try to delete each potential file
    for (const file of potentialFiles) {
      try {
        const filePath = path.join(uploadDir, file);
        await fs.unlink(filePath);
        console.log(`Deleted: ${file}`);
      } catch (error) {
        // File doesn't exist, continue
      }
    }
    
    console.log(`Image cleanup completed for: ${imagePath}`);
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw - image deletion shouldn't break content deletion
  }
};