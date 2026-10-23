import fs from 'fs';
import path from 'path';
import { MUSHROOMS_DATABASE } from '../data/mushrooms';
import { COMPARISON_PHOTOS } from '../data/sulphurHoneyComparison';
import { photosForSpecies, SPECIES_GALLERY } from '../data/speciesGallery';

/** 11,559,224 bytes of gallery WebP, plus about 20%, rounded up to the next KiB. */
const GALLERY_BYTE_BUDGET = 13_871_104;
const MAX_IMAGE_BYTES = 150 * 1024;
const MAX_LONG_SIDE = 1080;

const ROOT = path.resolve(__dirname, '../..');

function walkWebp(directory: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      found.push(...walkWebp(full));
    } else if (entry.name.endsWith('.webp')) {
      found.push(full);
    }
  }
  return found;
}

function webpSize(buffer: Buffer): { width: number; height: number } {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('not a webp');
  }
  const chunk = buffer.toString('ascii', 12, 16);
  if (chunk === 'VP8X') {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    };
  }
  if (chunk === 'VP8 ') {
    const start = 23;
    if (buffer[start] !== 0x9d || buffer[start + 1] !== 0x01 || buffer[start + 2] !== 0x2a) {
      throw new Error('bad vp8 frame');
    }
    return {
      width: buffer.readUInt16LE(start + 3) & 0x3fff,
      height: buffer.readUInt16LE(start + 5) & 0x3fff,
    };
  }
  if (chunk === 'VP8L') {
    if (buffer[20] !== 0x2f) {
      throw new Error('bad vp8l signature');
    }
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  throw new Error(`unknown webp chunk ${chunk}`);
}

describe('atlas gallery assets', () => {
  const photos = Object.values(SPECIES_GALLERY).flat();
  const assetPaths = [
    ...photos.map((photo) => photo.assetPath),
    ...COMPARISON_PHOTOS.map((photo) => photo.assetPath),
  ];
  const credited = [
    ...photos.map((photo) => ({ imageUrl: photo.imageUrl, sourceUrl: photo.sourceUrl })),
    ...COMPARISON_PHOTOS.map((photo) => ({ imageUrl: photo.imageUrl, sourceUrl: photo.sourceUrl })),
  ];

  it('keeps every poisonous card illustrated and leaves other cards without a gallery', () => {
    for (const species of MUSHROOMS_DATABASE) {
      const illustrated = species.status === 'POISONOUS' || species.status === 'DEADLY_POISONOUS';
      const gallery = photosForSpecies(species.id);
      if (illustrated) {
        expect(gallery.length).toBeGreaterThan(0);
      } else {
        expect(gallery).toEqual([]);
      }
    }
  });

  it('stores the shared Cortinarius file once', () => {
    const shared = photosForSpecies('cortinarius_orellanus').filter((photo) => photo.feature !== 'W');
    expect(shared.map((photo) => photo.feature).sort()).toEqual(['C', 'G', 'Y']);
    expect(new Set(shared.map((photo) => photo.assetPath)).size).toBe(1);
    expect(new Set(shared.map((photo) => photo.imageUrl)).size).toBe(1);
  });

  it('stays within the per-file and total size budget', () => {
    const onDisk = walkWebp(path.join(ROOT, 'assets/gallery')).map((file) =>
      path.relative(ROOT, file).split(path.sep).join('/'),
    );
    expect(new Set(onDisk)).toEqual(new Set(assetPaths));

    let total = 0;
    for (const relative of onDisk) {
      const buffer = fs.readFileSync(path.join(ROOT, relative));
      const { width, height } = webpSize(buffer);
      total += buffer.length;
      expect(buffer.length).toBeLessThanOrEqual(MAX_IMAGE_BYTES);
      expect(Math.max(width, height)).toBeLessThanOrEqual(MAX_LONG_SIDE);
    }
    expect(total).toBeLessThanOrEqual(GALLERY_BYTE_BUDGET);
  });

  it('matches the training exclusion list of image URLs and observation ids', () => {
    const exclusion = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'training/gallery_exclusion.json'), 'utf8'),
    ) as {
      photos: Array<{
        image_url: string;
        inaturalist_observation_id: string | null;
        source_url: string;
      }>;
    };
    const listedUrls = exclusion.photos.map((photo) => photo.image_url);
    expect(new Set(listedUrls)).toEqual(new Set(credited.map((photo) => photo.imageUrl)));
    expect(listedUrls.length).toBe(new Set(listedUrls).size);

    for (const row of exclusion.photos) {
      const match = credited.find((photo) => photo.imageUrl === row.image_url);
      expect(match?.sourceUrl).toBe(row.source_url);
      if (row.inaturalist_observation_id) {
        expect(match?.sourceUrl).toContain(`/observations/${row.inaturalist_observation_id}`);
      }
    }
  });
});
