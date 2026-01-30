import fs from 'fs/promises';
import path from 'path';

const ACTIVITY_FILE = path.join(process.cwd(), 'data', 'activity.json');

export type ActivityType = 'system' | 'trello' | 'mailchimp' | 'openai' | 'wordpress' | 'user' | 'memory' | 'security';

export interface ActivityLog {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class ActivityLogger {
  async init() {
    try {
      await fs.access(ACTIVITY_FILE);
    } catch {
      await fs.writeFile(ACTIVITY_FILE, JSON.stringify([], null, 2));
    }
  }

  async getLogs(limit: number = 20): Promise<ActivityLog[]> {
    await this.init();
    try {
      const data = await fs.readFile(ACTIVITY_FILE, 'utf-8');
      const logs: ActivityLog[] = JSON.parse(data);
      // Sort by timestamp descending
      return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
    } catch (error) {
      console.error('Error reading activity logs:', error);
      return [];
    }
  }

  async log(type: ActivityType, title: string, description: string, metadata?: Record<string, any>) {
    await this.init();
    try {
      const currentLogs = await this.getLogs(100); // Keep last 100
      const newLog: ActivityLog = {
        id: Math.random().toString(36).substring(2, 9),
        type,
        title,
        description,
        timestamp: new Date().toISOString(),
        metadata
      };
      
      const updatedLogs = [newLog, ...currentLogs];
      await fs.writeFile(ACTIVITY_FILE, JSON.stringify(updatedLogs, null, 2));
      return newLog;
    } catch (error) {
      console.error('Error writing activity log:', error);
    }
  }
}

export const activityLogger = new ActivityLogger();
