import { Request } from 'express';
import multer from 'multer';
import { buildFileFilter } from './uploadShared';
import { LocalDiskStorage, removeLocalFile } from './localStorage.engine';
import * as cloudinaryUploads from './cloudinary';

const hasCloudinaryConfig = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

function makeLocalUpload(
  folder: string,
  allowedFormats: string[],
  fileSizeMB: number
) {
  return multer({
    storage: new LocalDiskStorage(folder),
    limits: { fileSize: fileSizeMB * 1024 * 1024 },
    fileFilter: buildFileFilter(allowedFormats),
  });
}

export const uploadRecipePhoto = hasCloudinaryConfig
  ? cloudinaryUploads.uploadRecipePhoto
  : makeLocalUpload('javarista/recipes', ['jpg', 'jpeg', 'png', 'webp'], 5);

export const uploadPlaybookMedia = hasCloudinaryConfig
  ? cloudinaryUploads.uploadPlaybookMedia
  : makeLocalUpload('javarista/playbooks', ['jpg', 'jpeg', 'png', 'webp', 'pdf'], 20);

export const uploadChecklistPhoto = hasCloudinaryConfig
  ? cloudinaryUploads.uploadChecklistPhoto
  : makeLocalUpload('javarista/checklists', ['jpg', 'jpeg', 'png', 'webp'], 10);

export const uploadCertificationBadge = hasCloudinaryConfig
  ? cloudinaryUploads.uploadCertificationBadge
  : makeLocalUpload('javarista/badges', ['jpg', 'jpeg', 'png', 'webp', 'svg'], 2);

export const uploadAvatar = hasCloudinaryConfig
  ? cloudinaryUploads.uploadAvatar
  : makeLocalUpload('javarista/avatars', ['jpg', 'jpeg', 'png', 'webp'], 3);

/** Cloudinary paths are already absolute URLs; local paths need the request origin prefixed. */
export function toAbsoluteUrl(req: Request, filePath: string): string {
  if (/^https?:\/\//.test(filePath)) return filePath;
  return `${req.protocol}://${req.get('host')}${filePath}`;
}

export async function removeUpload(publicId: string): Promise<void> {
  if (hasCloudinaryConfig) {
    await cloudinaryUploads.cloudinary.uploader.destroy(publicId);
    return;
  }
  removeLocalFile(publicId);
}
