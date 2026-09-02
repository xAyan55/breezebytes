import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'breezebytes.json');

class Table {
  constructor(name, getDb, saveDb) {
    this.name = name;
    this.getDb = getDb;
    this.saveDb = saveDb;
  }

  get data() {
    const db = this.getDb();
    if (!db[this.name]) {
      db[this.name] = [];
    }
    return db[this.name];
  }

  find(predicate = () => true) {
    if (typeof predicate === 'function') {
      return this.data.filter(predicate);
    }
    return this.data.filter(item => {
      for (const [k, v] of Object.entries(predicate)) {
        if (item[k] !== v) return false;
      }
      return true;
    });
  }

  findOne(predicate) {
    if (typeof predicate === 'function') {
      return this.data.find(predicate) || null;
    }
    return this.data.find(item => {
      for (const [k, v] of Object.entries(predicate)) {
        if (item[k] !== v) return false;
      }
      return true;
    }) || null;
  }

  findById(id) {
    const numId = Number(id);
    return this.data.find(item => item.id === numId || item.id === id) || null;
  }

  insert(record) {
    const db = this.getDb();
    if (!db[this.name]) {
      db[this.name] = [];
    }
    const maxId = db[this.name].reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
    const newRecord = {
      id: maxId + 1,
      ...record,
      created_at: record.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db[this.name].push(newRecord);
    this.saveDb();
    return newRecord;
  }

  update(id, updates) {
    const numId = Number(id);
    const item = this.data.find(item => item.id === numId || item.id === id);
    if (!item) return null;
    Object.assign(item, updates, { updated_at: new Date().toISOString() });
    this.saveDb();
    return item;
  }

  delete(id) {
    const db = this.getDb();
    if (!db[this.name]) return false;
    const numId = Number(id);
    const initialLen = db[this.name].length;
    db[this.name] = db[this.name].filter(item => item.id !== numId && item.id !== id);
    if (db[this.name].length !== initialLen) {
      this.saveDb();
      return true;
    }
    return false;
  }

  deleteWhere(predicate) {
    const db = this.getDb();
    if (!db[this.name]) return 0;
    const initialLen = db[this.name].length;
    if (typeof predicate === 'function') {
      db[this.name] = db[this.name].filter(item => !predicate(item));
    } else {
      db[this.name] = db[this.name].filter(item => {
        for (const [k, v] of Object.entries(predicate)) {
          if (item[k] === v) return false;
        }
        return true;
      });
    }
    const deletedCount = initialLen - db[this.name].length;
    if (deletedCount > 0) {
      this.saveDb();
    }
    return deletedCount;
  }

  count(predicate = () => true) {
    return this.find(predicate).length;
  }
}

class DatabaseStore {
  constructor() {
    this.state = {};
    this.load();
    this.tables = {};
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.state = JSON.parse(raw);
      } else {
        this.state = {};
        this.save();
      }
    } catch (err) {
      console.error('[DB] Error reading database file, starting clean:', err.message);
      this.state = {};
    }
  }

  save() {
    try {
      const tempPath = `${DB_FILE}.${process.pid}.${Date.now()}.${Math.random().toString(36).substring(2, 8)}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.state, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('[DB] Error writing database file:', err.message);
    }
  }

  table(name) {
    if (!this.tables[name]) {
      this.tables[name] = new Table(name, () => this.state, () => this.save());
    }
    return this.tables[name];
  }
}

const dbStore = new DatabaseStore();

export const users = dbStore.table('users');
export const nodes = dbStore.table('nodes');
export const allocations = dbStore.table('allocations');
export const servers = dbStore.table('servers');
export const server_variables = dbStore.table('server_variables');
export const server_subusers = dbStore.table('server_subusers');
export const backups = dbStore.table('backups');
export const schedules = dbStore.table('schedules');
export const schedule_tasks = dbStore.table('schedule_tasks');
export const server_databases = dbStore.table('server_databases');
export const api_keys = dbStore.table('api_keys');
export const activity_logs = dbStore.table('activity_logs');
export const audit_logs = dbStore.table('audit_logs');
export const notifications = dbStore.table('notifications');
export const settings = dbStore.table('settings');
export const verification_tokens = dbStore.table('verification_tokens');
export const password_resets = dbStore.table('password_resets');
export const playit_tunnels = dbStore.table('playit_tunnels');
export const playit_nodes = dbStore.table('playit_nodes');

export default dbStore;
