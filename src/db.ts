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

// 定义数据库的 Schema
interface AudioDB extends DBSchema {
  records: {
    key: number;
    value: AudioRecord;
    indexes: { 'by-createdAt': number };
  };
}

let dbPromise: Promise<IDBPDatabase<AudioDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AudioDB>('MyEnglishAppDB', 1, {
      upgrade(db) {
        // 如果表不存在，就创建，并以 createdAt 建立索引方便倒序查询
        const store = db.createObjectStore('records', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('by-createdAt', 'createdAt');
      },
    });
  }
  return dbPromise;
}

/** 保存一条记录 */
export async function saveRecord(fileName: string, sentences: Sentence[], audioBlob: Blob) {
  const db = await getDB();
  const record: AudioRecord = {
    id: Date.now(), // 用时间戳当 ID，保证唯一
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
  return records.reverse(); // 因为 IndexedDB 默认是升序，反转一下就是倒序
}

/** 删除一条记录 */
export async function deleteRecord(id: number) {
  const db = await getDB();
  await db.delete('records', id);
}