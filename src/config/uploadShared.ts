import multer from 'multer';

export const FORMAT_MIMETYPES: Record<string, string[]> = {
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  pdf: ['application/pdf'],
  svg: ['image/svg+xml'],
};

export function buildFileFilter(allowedFormats: string[]) {
  const allowedMimes = new Set(
    allowedFormats.flatMap((fmt) => FORMAT_MIMETYPES[fmt] ?? []),
  );
  return (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback,
  ) => {
    if (allowedMimes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Accepted: ${allowedFormats.join(', ')}`));
    }
  };
}
