import path from 'path';
import fs from 'fs/promises';

export interface OptimizedImages {
  original: string;
  thumbnail: string;
}

export const optimizeImage = async (filepath: string): Promise<OptimizedImages> => {
  try {
    console.log('Processing image:', filepath);
    
    // Convert absolute path to relative URL for web serving
    // Remove the upload directory prefix to get just the filename
    const filename = path.basename(filepath);
    const webPath = `/uploads/${filename}`;
    
    console.log('Image web path:', webPath);
    
    return {
      original: webPath,
      thumbnail: webPath, // Use same image for now to speed up
    };
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error('Failed to process image');
  }
};

export const deleteImage = async (filepath: string): Promise<void> => {
  try {
    console.log('Deleting image:', filepath);
    
    // Handle both full paths and relative URLs
    let actualPath = filepath;
    if (filepath.startsWith('/uploads/')) {
      // Convert web URL back to actual file path
      const uploadDir = process.env.NODE_ENV === 'production' 
        ? (process.env.UPLOAD_DIR || '/app/uploads')
        : path.join(__dirname, '../../uploads');
      actualPath = path.join(uploadDir, path.basename(filepath));
    }
    
    await fs.unlink(actualPath);
    console.log('Image deleted successfully:', actualPath);
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw error to prevent blocking other operations
  }
};
