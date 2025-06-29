/**
 * File validation utilities for consistent payload size checking
 */

export const FILE_SIZE_LIMITS = {
  MAX_PAYLOAD: 50 * 1024 * 1024, // 50MB
  PROFILE_IMAGE: 10 * 1024 * 1024, // 10MB for profile images
} as const;

export interface FileValidationResult {
  isValid: boolean;
  error?: {
    title: string;
    description: string;
  };
}

/**
 * Validates file size and type for uploads
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    clearInput?: (input: HTMLInputElement) => void;
  } = {}
): FileValidationResult {
  const {
    maxSize = FILE_SIZE_LIMITS.MAX_PAYLOAD,
    allowedTypes = ['image/'],
  } = options;

  // Validate file type
  const isValidType = allowedTypes.some(type => 
    type.endsWith('/') ? file.type.startsWith(type) : file.type === type
  );

  if (!isValidType) {
    return {
      isValid: false,
      error: {
        title: "Invalid file type",
        description: "Please select a valid image file.",
      }
    };
  }

  // Validate file size
  if (file.size > maxSize) {
    const sizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      isValid: false,
      error: {
        title: "File too large",
        description: `The selected file exceeds the ${sizeMB}MB limit. Please choose a smaller file.`,
      }
    };
  }

  return { isValid: true };
}

/**
 * Calculates and formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Clears file input value to allow re-selection of the same file
 */
export function clearFileInput(input: HTMLInputElement | null): void {
  if (input) {
    input.value = '';
  }
}