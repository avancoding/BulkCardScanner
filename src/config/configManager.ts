// Configuration management
import { readJson, writeJsonAtomic } from '../io/fileUtils';

export interface Config {
  rarities: string[];
}

const CONFIG_PATH = 'config.json';

const DEFAULT_CONFIG: Config = {
  rarities: ["Common", "Uncommon", "Rare", "Rare Holo", "Reverse", "Promo"]
};

/**
 * Loads configuration from disk, returns default if file doesn't exist
 * @returns Promise resolving to configuration object
 */
export async function loadConfig(): Promise<Config> {
  try {
    const config = await readJson<Config>(CONFIG_PATH);
    return config ? { ...DEFAULT_CONFIG, ...config } : DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Saves configuration to disk
 * @param config Configuration object to save
 * @returns Promise that resolves when save is complete
 */
export async function saveConfig(config: Config): Promise<void> {
  await writeJsonAtomic(CONFIG_PATH, config);
}