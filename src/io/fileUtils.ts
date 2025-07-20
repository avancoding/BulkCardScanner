// File utilities with atomic operations
import * as fs from "fs/promises";
import * as path from "path";

/**
 * Atomically write JSON data to a file using temp file + rename pattern
 */
export async function writeJsonAtomic(filePath: string, data: any): Promise<void> {
  const tempPath = `${filePath}.tmp`;
  
  try {
    // Write to temporary file
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(tempPath, jsonData, "utf8");
    
    // Ensure data is written to disk
    const fileHandle = await fs.open(tempPath, "r+");
    await fileHandle.sync();
    await fileHandle.close();
    
    // Atomic rename
    await fs.rename(tempPath, filePath);
  } catch (error) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}

/**
 * Read and parse JSON file, returning null if file doesn't exist
 */
export async function readJson<T>(filePath: string): Promise<T | null> {
  try {
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data) as T;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}