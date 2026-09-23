import { readdir, readFile, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import exifr from "exifr";
import { imageSize } from "image-size";

const imagesDirectory = resolve(process.cwd(), "public/images");
const imageExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".tif", ".tiff"]);

type ImageMetadata = {
  file: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  modifiedAt: string;
  dimensions?: {
    width?: number;
    height?: number;
    type?: string;
  };
  exif?: Record<string, unknown>;
  error?: string;
};

async function findImages(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await findImages(entryPath));
      continue;
    }

    if (entry.isFile() && imageExtensions.has(extname(entry.name).toLowerCase())) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

function mimeTypeFor(extension: string): string {
  const mimeTypes: Record<string, string> = {
    ".avif": "image/avif",
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".webp": "image/webp"
  };

  return mimeTypes[extension] ?? "application/octet-stream";
}

async function readImageMetadata(filePath: string): Promise<ImageMetadata> {
  const extension = extname(filePath).toLowerCase();
  const [fileStats, buffer] = await Promise.all([stat(filePath), readFile(filePath)]);
  const metadata: ImageMetadata = {
    file: relative(process.cwd(), filePath),
    extension,
    mimeType: mimeTypeFor(extension),
    sizeBytes: fileStats.size,
    modifiedAt: fileStats.mtime.toISOString()
  };

  try {
    const dimensions = imageSize(buffer);
    metadata.dimensions = {
      width: dimensions.width,
      height: dimensions.height,
      type: dimensions.type
    };
  } catch (error) {
    metadata.error = error instanceof Error ? error.message : "Unable to read image dimensions";
  }

  if (extension === ".jpg" || extension === ".jpeg" || extension === ".tif" || extension === ".tiff") {
    const exif = await exifr.parse(buffer, { translateValues: false });
    if (exif) {
      metadata.exif = exif as Record<string, unknown>;
    }
  }

  return metadata;
}

async function main(): Promise<void> {
  const imagePaths = await findImages(imagesDirectory);
  const images = await Promise.all(imagePaths.map(async (filePath) => {
    try {
      return await readImageMetadata(filePath);
    } catch (error) {
      return {
        file: relative(process.cwd(), filePath),
        extension: extname(filePath).toLowerCase(),
        mimeType: mimeTypeFor(extname(filePath).toLowerCase()),
        sizeBytes: 0,
        modifiedAt: "",
        error: error instanceof Error ? error.message : "Unable to read image metadata"
      } satisfies ImageMetadata;
    }
  }));

  console.log(JSON.stringify({
    directory: relative(process.cwd(), imagesDirectory),
    imageCount: images.length,
    images
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});