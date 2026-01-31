import fs from 'fs/promises';
import path from 'path';

const NOTIFICATIONS_FILE = path.join(process.cwd(), 'data', 'notifications.json');

export type NotificationType = 'info' | 'alert' | 'action_required';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  actionPayload?: string; // Text to pre-fill in chat if clicked
  timestamp: string;
}

export class NotificationManager {
  async init() {
    try {
      await fs.access(NOTIFICATIONS_FILE);
    } catch {
      await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify([], null, 2));
    }
  }

  async getNotifications(): Promise<Notification[]> {
    await this.init();
    try {
      const data = await fs.readFile(NOTIFICATIONS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading notifications:', error);
      return [];
    }
  }

  async create(title: string, message: string, type: NotificationType = 'info', actionPayload?: string): Promise<Notification> {
    const notifications = await this.getNotifications();
    const newNote: Notification = {
      id: Math.random().toString(36).substring(2, 11),
      title,
      message,
      type,
      read: false,
      actionPayload,
      timestamp: new Date().toISOString()
    };
    
    // Keep list manageable
    const updated = [newNote, ...notifications].slice(0, 50);
    await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(updated, null, 2));
    return newNote;
  }

  async markAsRead(id: string): Promise<void> {
    const notifications = await this.getNotifications();
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(updated, null, 2));
  }

  async markAllAsRead(): Promise<void> {
    const notifications = await this.getNotifications();
    const updated = notifications.map(n => ({ ...n, read: true }));
    await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(updated, null, 2));
  }
}

export const notificationManager = new NotificationManager();
