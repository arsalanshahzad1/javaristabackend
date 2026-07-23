import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { StorageEngine } from 'multer';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

/**
 * Multer storage engine that writes to local disk under uploads/<folder>/.
 * Sets file.path to the public URL path (e.g. /uploads/javarista/checklists/xyz.jpg)
 * and file.filename to the folder-relative id (used by deleteUpload), matching the
 * shape multer-storage-cloudinary produces so upload.controller.ts needs no branching.
 */
export class LocalDiskStorage implements StorageEngine {
  constructor(private folder: string) {}

  _handleFile(
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error?: unknown, info?: Partial<Express.Multer.File>) => void
  ): void {
    const ext = path.extname(file.originalname) || '';
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const relativeId = `${this.folder}/${uniqueName}`;
    const destDir = path.join(UPLOADS_ROOT, this.folder);
    const destPath = path.join(destDir, uniqueName);

    fs.mkdir(destDir, { recursive: true }, (mkdirErr) => {
      if (mkdirErr) {
        cb(mkdirErr);
        return;
      }

      const writeStream = fs.createWriteStream(destPath);
      let size = 0;
      file.stream.on('data', (chunk: Buffer) => {
        size += chunk.length;
      });
      file.stream.pipe(writeStream);
      writeStream.on('error', cb);
      writeStream.on('finish', () => {
        cb(null, {
          destination: destDir,
          filename: relativeId,
          path: `/uploads/${relativeId}`,
          size,
        });
      });
    });
  }

  _removeFile(
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null) => void
  ): void {
    fs.unlink(path.join(UPLOADS_ROOT, file.filename), () => cb(null));
  }
}

export function removeLocalFile(relativeId: string): void {
  fs.unlink(path.join(UPLOADS_ROOT, relativeId), () => {
    // Best-effort — ignore missing file.
  });
}
