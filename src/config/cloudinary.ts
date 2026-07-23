import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import { buildFileFilter } from './uploadShared';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function makeUpload(
  folder: string,
  allowedFormats: string[],
  fileSizeMB: number,
  transformation?: object[],
) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      allowed_formats: allowedFormats,
      ...(transformation && { transformation }),
    } as object,
  });

  return multer({
    storage,
    limits: { fileSize: fileSizeMB * 1024 * 1024 },
    fileFilter: buildFileFilter(allowedFormats),
  });
}

export const uploadRecipePhoto = makeUpload(
  'javarista/recipes',
  ['jpg', 'jpeg', 'png', 'webp'],
  5,
  [{ width: 1200, crop: 'limit', quality: 'auto' }],
);

export const uploadPlaybookMedia = makeUpload(
  'javarista/playbooks',
  ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
  20,
);

export const uploadChecklistPhoto = makeUpload(
  'javarista/checklists',
  ['jpg', 'jpeg', 'png', 'webp'],
  10,
  [{ width: 1600, crop: 'limit', quality: 'auto' }],
);

export const uploadCertificationBadge = makeUpload(
  'javarista/badges',
  ['jpg', 'jpeg', 'png', 'webp', 'svg'],
  2,
  [{ width: 400, height: 400, crop: 'fill' }],
);

export const uploadAvatar = makeUpload(
  'javarista/avatars',
  ['jpg', 'jpeg', 'png', 'webp'],
  3,
  [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
);

export { cloudinary };
