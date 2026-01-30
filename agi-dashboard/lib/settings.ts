import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

export interface SystemSettings {
  trello_api_key: string;
  trello_api_token: string;
  openai_api_key: string;
  mailchimp_api_key: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  trello_api_key: '',
  trello_api_token: '',
  openai_api_key: '',
  mailchimp_api_key: ''
};

export class SettingsManager {
  async init() {
    try {
      await fs.access(SETTINGS_FILE);
    } catch {
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
    }
  }

  async getSettings(): Promise<SystemSettings> {
    await this.init();
    try {
      const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (error) {
      console.error('Error reading settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  async updateSettings(newSettings: Partial<SystemSettings>): Promise<SystemSettings> {
    const current = await this.getSettings();
    const updated = {
      ...current,
      ...newSettings
    };
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(updated, null, 2));
    return updated;
  }
}

export const settingsManager = new SettingsManager();
