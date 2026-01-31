import fs from 'fs/promises';
import path from 'path';

const OPERATIONS_FILE = path.join(process.cwd(), 'data', 'operations.json');

export type OperationStatus = 'queued' | 'running' | 'paused' | 'completed' | 'failed';

export interface OperationStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: string;
  timestamp: string;
}

export interface Operation {
  id: string;
  title: string;
  description: string;
  type: string;
  status: OperationStatus;
  progress: number; // 0-100
  steps: OperationStep[];
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

export class OperationsManager {
  async init() {
    try {
      await fs.access(OPERATIONS_FILE);
    } catch {
      await fs.writeFile(OPERATIONS_FILE, JSON.stringify([], null, 2));
    }
  }

  async getOperations(): Promise<Operation[]> {
    await this.init();
    try {
      const data = await fs.readFile(OPERATIONS_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading operations:', error);
      return [];
    }
  }

  async getOperation(id: string): Promise<Operation | null> {
    const operations = await this.getOperations();
    return operations.find(op => op.id === id) || null;
  }

  async createOperation(title: string, description: string, type: string = 'general'): Promise<Operation> {
    const operations = await this.getOperations();
    const newOperation: Operation = {
      id: Math.random().toString(36).substring(2, 11),
      title,
      description,
      type,
      status: 'queued',
      progress: 0,
      steps: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    operations.unshift(newOperation);
    await fs.writeFile(OPERATIONS_FILE, JSON.stringify(operations, null, 2));
    return newOperation;
  }

  async updateOperation(id: string, updates: Partial<Operation>): Promise<Operation | null> {
    const operations = await this.getOperations();
    const index = operations.findIndex(op => op.id === id);
    
    if (index === -1) return null;

    operations[index] = {
      ...operations[index],
      ...updates,
      updated_at: new Date().toISOString()
    };

    await fs.writeFile(OPERATIONS_FILE, JSON.stringify(operations, null, 2));
    return operations[index];
  }

  async addStep(operationId: string, description: string): Promise<Operation | null> {
    const operations = await this.getOperations();
    const index = operations.findIndex(op => op.id === operationId);
    
    if (index === -1) return null;

    const step: OperationStep = {
      id: Math.random().toString(36).substring(2, 11),
      description,
      status: 'completed', // Assuming we log steps as they happen or are planned
      timestamp: new Date().toISOString()
    };

    operations[index].steps.push(step);
    operations[index].updated_at = new Date().toISOString();

    await fs.writeFile(OPERATIONS_FILE, JSON.stringify(operations, null, 2));
    return operations[index];
  }

  async deleteOperation(id: string): Promise<boolean> {
    const operations = await this.getOperations();
    const filtered = operations.filter(op => op.id !== id);
    if (filtered.length === operations.length) return false;
    await fs.writeFile(OPERATIONS_FILE, JSON.stringify(filtered, null, 2));
    return true;
  }
}

export const operationsManager = new OperationsManager();
