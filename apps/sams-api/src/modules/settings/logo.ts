import sharp from 'sharp';
import { BusinessRuleError } from '../../common/errors/application-error';
export async function canonicalLogo(input: Buffer): Promise<string> {
  const png = input
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = input[0] === 255 && input[1] === 216 && input[2] === 255;
  const webp =
    input.subarray(0, 4).toString() === 'RIFF' &&
    input.subarray(8, 12).toString() === 'WEBP';
  if (!input.length || input.length > 2 * 1024 * 1024 || !(png || jpeg || webp))
    throw invalidLogo();
  try {
    const image = sharp(input, {
      limitInputPixels: 4096 * 4096,
      failOn: 'warning',
      animated: false
    });
    const metadata = await image.metadata();
    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width > 4096 ||
      metadata.height > 4096 ||
      (metadata.pages ?? 1) > 1
    )
      throw invalidLogo();
    // Decoding and re-encoding drops EXIF and ancillary payloads. The original
    // upload/filename is never stored or served. No remote URLs are fetched.
    const output = await image
      .rotate()
      .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    if (output.length > 49152) throw invalidLogo();
    return `data:image/webp;base64,${output.toString('base64')}`;
  } catch {
    throw invalidLogo();
  }
}
function invalidLogo() {
  return new BusinessRuleError(
    'INVALID_SCHOOL_LOGO',
    'Choose a valid, non-animated PNG, JPEG or WebP up to 2 MB and 4096 × 4096 pixels.'
  );
}
