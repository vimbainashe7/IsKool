import sharp from 'sharp';
import { canonicalLogo } from '../logo';
describe('bounded school logo ingestion', () => {
  it('decodes a real PNG and returns a bounded canonical WebP without input metadata', async () => {
    const png = await sharp({
      create: { width: 400, height: 300, channels: 4, background: '#124578' }
    })
      .png()
      .toBuffer();
    const uri = await canonicalLogo(png);
    expect(uri.startsWith('data:image/webp;base64,')).toBe(true);
    const canonical = Buffer.from(uri.split(',')[1], 'base64');
    const metadata = await sharp(canonical).metadata();
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBeLessThanOrEqual(256);
    expect(metadata.exif).toBeUndefined();
    expect(canonical.length).toBeLessThanOrEqual(49152);
  });
  it('rejects SVG, misleading file headers, corrupt bytes and oversized uploads', async () => {
    for (const input of [
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),
      Buffer.from('RIFF0000WEBPmalformed'),
      Buffer.alloc(2 * 1024 * 1024 + 1)
    ]) {
      await expect(canonicalLogo(input)).rejects.toThrow();
    }
  });
  it('rejects excessive pixel dimensions before generating a logo', async () => {
    const input = await sharp({
      create: { width: 5000, height: 1, channels: 3, background: '#fff' }
    })
      .png()
      .toBuffer();
    await expect(canonicalLogo(input)).rejects.toThrow();
  });
});
