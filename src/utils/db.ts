import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

// 定义数据结构
export interface Sentence {
  text: string;
  start: number;
  end: number;
}

export interface AudioRecord {
  id: number;
  fileName: string;
  createdAt: number; // 上传时间戳
  sentences: Sentence[];
  audioBlob: Blob;   // 保存真实的 MP3 文件
}

export interface GrammarAnalysis {
  text: string;
  translation: string;
  tokens: any[]; // 单词列表
  groups: any[]; // 成分分组
  cachedAt?: number;
}

// 💡 关键修改：在 Schema 里声明 grammar_cache
interface AudioDB extends DBSchema {
  records: {
    key: number;
    value: AudioRecord;
    indexes: { 'by-createdAt': number };
  };
  grammar_cache: {
    key: string;
    value: GrammarAnalysis;
  };
}

let dbPromise: Promise<IDBPDatabase<AudioDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    // 名字保持你改的 MyEnglishAppDB2，版本号是 1
    dbPromise = openDB<AudioDB>('MyEnglishAppDB2', 1, {
      upgrade(db) {
        // 1. 创建 records 表
        if (!db.objectStoreNames.contains('records')) {
          const store = db.createObjectStore('records', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('by-createdAt', 'createdAt');
        }
        
        // 2. 💡 关键修改：创建 grammar_cache 表
        if (!db.objectStoreNames.contains('grammar_cache')) {
          db.createObjectStore('grammar_cache', { keyPath: 'text' });
        }
      },
    });
  }
  return dbPromise;
}

/** 保存一条记录 */
export async function saveRecord(fileName: string, sentences: Sentence[], audioBlob: Blob) {
  const db = await getDB();
  const record: AudioRecord = {
    id: Date.now(),
    fileName,
    createdAt: Date.now(),
    sentences,
    audioBlob,
  };
  await db.add('records', record);
  return record;
}

/** 获取所有记录（按时间倒序） */
export async function getAllRecords() {
  const db = await getDB();
  const records = await db.getAllFromIndex('records', 'by-createdAt');
  return records.reverse();
}

/** 删除一条记录 */
export async function deleteRecord(id: number) {
  const db = await getDB();
  await db.delete('records', id);
}

// 💡 读取和保存语法分析（现在表建好了，就不会报错了）
export async function getGrammarCache(text: string) {
  const db = await getDB();
  return db.get('grammar_cache', text);
}

export async function saveGrammarCache(data: GrammarAnalysis) {
  const db = await getDB();
  data.cachedAt = Date.now();
  await db.put('grammar_cache', data);
}