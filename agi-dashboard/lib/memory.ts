import fs from 'fs/promises';
import path from 'path';

const MEMORY_FILE = path.join(process.cwd(), 'data', 'memory.json');

export interface Memory {
  long_term_goals: string[];
  company_info: string;
  key_facts: string[];
  last_updated: string;
}

const DEFAULT_MEMORY: Memory = {
  long_term_goals: [],
  company_info: "",
  key_facts: [],
  last_updated: new Date().toISOString()
};

export class MemoryManager {
  async init() {
    try {
      await fs.access(MEMORY_FILE);
    } catch {
      await fs.writeFile(MEMORY_FILE, JSON.stringify(DEFAULT_MEMORY, null, 2));
    }
  }

  async read(): Promise<Memory> {
    await this.init();
    const data = await fs.readFile(MEMORY_FILE, 'utf-8');
    return JSON.parse(data);
  }

  async update(newMemory: Partial<Memory>) {
    const current = await this.read();
    const updated = {
      ...current,
      ...newMemory,
      last_updated: new Date().toISOString()
    };
    await fs.writeFile(MEMORY_FILE, JSON.stringify(updated, null, 2));
    return updated;
  }

  async appendFact(fact: string) {
    const current = await this.read();
    current.key_facts.push(fact);
    return this.update({ key_facts: current.key_facts });
  }
}
