import { promises as fs } from 'fs';
import * as path from 'path';

export interface MemoryEntry {
  id: number;
  text: string;
  tags: string[];
  createdAt: string;
}

/** Local JSON-file memory: no credentials, no cost. Writes are atomic (temp file + rename). */
export class MemoryStore {
  private entries: MemoryEntry[] = [];
  private loaded = false;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private file: string) {}

  private async load(): Promise<void> {
    if (this.loaded) return;
    try {
      this.entries = JSON.parse(await fs.readFile(this.file, 'utf8'));
    } catch (e: any) {
      if (e.code !== 'ENOENT') throw e;
    }
    this.loaded = true;
  }

  private async save(): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(this.entries, null, 2));
    await fs.rename(tmp, this.file);
  }

  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(fn);
    this.queue = run.catch(() => undefined);
    return run;
  }

  add(text: string, tags: string[] = []): Promise<MemoryEntry> {
    return this.serial(async () => {
      await this.load();
      const id = this.entries.reduce((m, e) => Math.max(m, e.id), 0) + 1;
      const entry = { id, text, tags, createdAt: new Date().toISOString() };
      this.entries.push(entry);
      await this.save();
      return entry;
    });
  }

  /** Case-insensitive substring search over text and tags, newest first. */
  search(query: string, limit = 10): Promise<MemoryEntry[]> {
    return this.serial(async () => {
      await this.load();
      const q = query.toLowerCase();
      return this.entries
        .filter((e) => e.text.toLowerCase().includes(q) || e.tags.some((t) => t.toLowerCase() === q))
        .reverse()
        .slice(0, limit);
    });
  }

  remove(id: number): Promise<boolean> {
    return this.serial(async () => {
      await this.load();
      const n = this.entries.length;
      this.entries = this.entries.filter((e) => e.id !== id);
      if (this.entries.length === n) return false;
      await this.save();
      return true;
    });
  }
}
