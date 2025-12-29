import * as path from 'path';
import * as fs from 'fs/promises';
import sharp from 'sharp';

export interface OptimizedImages {
  original: string;
  thumbnail: string;
  medium?: string;
  large?: string;
}

const getUploadDir = (): string => {
  return process.env.NODE_ENV === 'production' 
    ? (process.env.UPLOAD_DIR || '/app/uploads')
    : path.join(__dirname, '../../uploads');
};

export const optimizeImage = async (filepath: string): Promise<OptimizedImages> => {
  try {
    console.log('Processing image:', filepath);
    
    const filename = path.basename(filepath, path.extname(filepath));
    const ext = path.extname(filepath);
    const uploadDir = getUploadDir();
    
    // Generate optimized filenames
    const originalName = `${filename}_original${ext}`;
    const thumbnailName = `${filename}_thumb.webp`;
    const mediumName = `${filename}_medium.webp`;
    const largeName = `${filename}_large.webp`;
    
    // File paths
    const originalPath = path.join(uploadDir, originalName);
    const thumbnailPath = path.join(uploadDir, thumbnailName);
    const mediumPath = path.join(uploadDir, mediumName);
    const largePath = path.join(uploadDir, largeName);
    
    try {
      // Read original image
      const imageBuffer = await fs.readFile(filepath);
      const image = sharp(imageBuffer);
      
      // Get image metadata
      const metadata = await image.metadata();
      console.log(`Original image: ${metadata.width}x${metadata.height}, ${metadata.format}`);
      
      // Process images in parallel for better performance
      await Promise.all([
        // Optimized original (compressed but full size)
        image
          .resize(metadata.width! > 2048 ? 2048 : undefined, metadata.height! > 2048 ? 2048 : undefined, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85, progressive: true })
          .toFile(originalPath),
          
        // Thumbnail (300px max)
        image
          .resize(300, 300, { fit: 'cover', position: 'center' })
          .webp({ quality: 80 })
          .toFile(thumbnailPath),
          
        // Medium (800px max)
        image
          .resize(800, 600, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(mediumPath),
          
        // Large (1200px max)
        image
          .resize(1200, 900, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 90 })
          .toFile(largePath)
      ]);
      
      // Remove original unoptimized file
      await fs.unlink(filepath);
      
      console.log('Image optimization completed');
      
      return {
        original: `/uploads/${originalName}`,
        thumbnail: `/uploads/${thumbnailName}`,
        medium: `/uploads/${mediumName}`,
        large: `/uploads/${largeName}`
      };
      
    } catch (sharpError) {
      console.log('Sharp optimization failed, falling back to original:', sharpError);
      
      // Fallback: just move original file
      const fallbackName = `${filename}${ext}`;
      const fallbackPath = path.join(uploadDir, fallbackName);
      await fs.rename(filepath, fallbackPath);
      
      const webPath = `/uploads/${fallbackName}`;
      return {
        original: webPath,
        thumbnail: webPath
      };
    }
    
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error('Failed to process image');
  }
};

export const deleteImage = async (filepath: string): Promise<void> => {
  try {
    console.log('Deleting image:', filepath);
    
    const uploadDir = getUploadDir();
    
    if (filepath.startsWith('/uploads/')) {
      const filename = path.basename(filepath);
      const baseName = filename.replace(/_(original|thumb|medium|large)\.(jpg|jpeg|png|webp)$/i, '');
      
      // Delete all variants of the image
      const variants = [
        filename, // The specific file requested
        `${baseName}_original.jpg`,
        `${baseName}_original.jpeg`,
        `${baseName}_original.png`,
        `${baseName}_thumb.webp`,
        `${baseName}_medium.webp`,
        `${baseName}_large.webp`,
        `${baseName}.jpg`,
        `${baseName}.jpeg`,
        `${baseName}.png`,
        `${baseName}.webp`
      ];
      
      // Try to delete each variant
      await Promise.allSettled(
        variants.map(async (variant) => {
          try {
            const variantPath = path.join(uploadDir, variant);
            await fs.unlink(variantPath);
            console.log('Deleted image variant:', variant);
          } catch (e) {
            // Silent fail for missing variants
          }
        })
      );
    } else {
      // Direct file path
      await fs.unlink(filepath);
      console.log('Image deleted successfully:', filepath);
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw error to prevent blocking other operations
  }
};
