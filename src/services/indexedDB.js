const DB_NAME = 'CubicELearningDB';
const DB_VERSION = 2; // Increased version to add videos store

// Database structure
const stores = {
  courses: { keyPath: '_id' },
  userProgress: { keyPath: 'id', indices: [{ name: 'courseId', unique: false }] },
  syncQueue: { keyPath: 'id', autoIncrement: true },
  videos: { keyPath: 'id' } // Store for video blobs
};

// Initialize the database
export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;
      
      // Create object stores based on version
      if (oldVersion < 1) {
        // Version 1 stores
        if (!db.objectStoreNames.contains('courses')) {
          console.log('Creating courses store');
          db.createObjectStore('courses', { keyPath: stores.courses.keyPath });
        }
        
        if (!db.objectStoreNames.contains('userProgress')) {
          console.log('Creating userProgress store');
          const userProgressStore = db.createObjectStore('userProgress', { keyPath: stores.userProgress.keyPath });
          userProgressStore.createIndex('courseId', 'courseId', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('syncQueue')) {
          console.log('Creating syncQueue store');
          db.createObjectStore('syncQueue', { keyPath: stores.syncQueue.keyPath, autoIncrement: true });
        }
      }
      
      if (oldVersion < 2) {
        // Version 2 adds videos store
        if (!db.objectStoreNames.contains('videos')) {
          console.log('Creating videos store');
          db.createObjectStore('videos', { keyPath: stores.videos.keyPath });
        }
      }
    };
    
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
};

// Generic CRUD operations
export const addItem = (storeName, item) => {
  return dbOperation(storeName, 'readwrite', (store) => {
    return store.add(item);
  });
};

export const getItem = (storeName, key) => {
  return dbOperation(storeName, 'readonly', (store) => {
    return store.get(key);
  });
};

export const updateItem = (storeName, item) => {
  return dbOperation(storeName, 'readwrite', (store) => {
    return store.put(item);
  });
};

export const deleteItem = (storeName, key) => {
  return dbOperation(storeName, 'readwrite', (store) => {
    return store.delete(key);
  });
};

export const getAllItems = (storeName) => {
  return dbOperation(storeName, 'readonly', (store) => {
    return store.getAll();
  });
};

// Helper function for database operations
export const dbOperation = (storeName, mode, operation) => {
  return new Promise((resolve, reject) => {
    initDB().then(db => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      
      const request = operation(store);
      
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    }).catch(error => reject(error));
  });
};
