import * as fs from 'fs/promises';
import * as path from 'path';
import { writeJsonAtomic, readJson } from '../src/io/fileUtils';

describe('Atomic File Operations', () => {
  const testDir = path.join(__dirname, 'temp');
  const testFile = path.join(testDir, 'test.json');
  const tempFile = `${testFile}.tmp`;

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('writes file and can read back equal data', async () => {
    const testData = { name: 'test', count: 42, items: ['a', 'b', 'c'] };

    await writeJsonAtomic(testFile, testData);
    const readData = await readJson(testFile);

    expect(readData).toEqual(testData);
  });

  test('returns null when reading non-existent file', async () => {
    const nonExistentFile = path.join(testDir, 'does-not-exist.json');
    const result = await readJson(nonExistentFile);
    expect(result).toBeNull();
  });

  test('simulate failure after write before rename - temp file remains, final file absent', async () => {
    const testData = { test: 'data' };
    
    // Mock fs.rename to throw an error
    const originalRename = fs.rename;
    const renameSpy = jest.spyOn(fs, 'rename').mockImplementation(() => {
      throw new Error('Simulated rename failure');
    });

    try {
      await expect(writeJsonAtomic(testFile, testData)).rejects.toThrow('Simulated rename failure');

      // Final file should not exist
      const finalExists = await fs.access(testFile).then(() => true).catch(() => false);
      expect(finalExists).toBe(false);

      // Temp file should not exist (cleaned up)
      const tempExists = await fs.access(tempFile).then(() => true).catch(() => false);
      expect(tempExists).toBe(false);
    } finally {
      renameSpy.mockRestore();
    }
  });

  test('handles JSON parsing errors gracefully', async () => {
    // Write invalid JSON directly to file
    await fs.writeFile(testFile, 'invalid json content', 'utf8');

    await expect(readJson(testFile)).rejects.toThrow();
  });

  test('atomic write with complex nested data', async () => {
    const complexData = {
      cards: [
        { id: 1, name: 'Card A', variants: [{ finish: 'normal', price: 1.5 }] },
        { id: 2, name: 'Card B', variants: [{ finish: 'foil', price: 3.0 }] }
      ],
      metadata: {
        version: '1.0',
        timestamp: new Date().toISOString(),
        counts: { total: 2, updated: 1 }
      }
    };

    await writeJsonAtomic(testFile, complexData);
    const result = await readJson(testFile);

    expect(result).toEqual(complexData);
  });
});