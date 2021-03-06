/* eslint-env browser */
import * as promise from './promise.js'
import * as error from './error.js'

/**
 * IDB Request to Promise transformer
 *
 * @param {IDBRequest} request
 * @return {Promise<any>}
 */
/* istanbul ignore next */
export const rtop = request => promise.create((resolve, reject) => {
  /* istanbul ignore next */
  // @ts-ignore
  request.onerror = event => reject(new Error(event.target.error))
  /* istanbul ignore next */
  // @ts-ignore
  request.onblocked = () => location.reload()
  // @ts-ignore
  request.onsuccess = event => resolve(event.target.result)
})

/**
 * @param {string} name
 * @param {Function} initDB Called when the database is first created
 * @return {Promise<IDBDatabase>}
 */
/* istanbul ignore next */
export const openDB = (name, initDB) => promise.create((resolve, reject) => {
  const request = indexedDB.open(name)
  /**
   * @param {any} event
   */
  request.onupgradeneeded = event => initDB(event.target.result)
  /* istanbul ignore next */
  /**
   * @param {any} event
   */
  request.onerror = event => reject(error.create(event.target.error))
  /* istanbul ignore next */
  request.onblocked = () => location.reload()
  /**
   * @param {any} event
   */
  request.onsuccess = event => {
    /**
     * @type {IDBDatabase}
     */
    const db = event.target.result
    /* istanbul ignore next */
    db.onversionchange = () => { db.close() }
    /* istanbul ignore if */
    if (typeof addEventListener !== 'undefined') {
      addEventListener('unload', () => db.close())
    }
    resolve(db)
  }
})

/**
 * @param {string} name
 */
/* istanbul ignore next */
export const deleteDB = name => rtop(indexedDB.deleteDatabase(name))

/**
 * @param {IDBDatabase} db
 * @param {Array<[string,IDBObjectStoreParameters|undefined]>} definitions
 */
/* istanbul ignore next */
export const createStores = (db, definitions) => definitions.forEach(d =>
  db.createObjectStore.apply(db, d)
)

/**
 * @param {IDBObjectStore} store
 * @param {String | number | ArrayBuffer | Date | Array<any> } key
 * @return {Promise<String | number | ArrayBuffer | Date | Array<any>>}
 */
/* istanbul ignore next */
export const get = (store, key) =>
  rtop(store.get(key))

/**
 * @param {IDBObjectStore} store
 * @param {String | number | ArrayBuffer | Date | IDBKeyRange | Array<any> } key
 */
/* istanbul ignore next */
export const del = (store, key) =>
  rtop(store.delete(key))

/**
 * @param {IDBObjectStore} store
 * @param {String | number | ArrayBuffer | Date | boolean} item
 * @param {String | number | ArrayBuffer | Date | Array<any>} [key]
 */
/* istanbul ignore next */
export const put = (store, item, key) =>
  rtop(store.put(item, key))

/**
 * @param {IDBObjectStore} store
 * @param {String | number | ArrayBuffer | Date | boolean}  item
 * @param {String | number | ArrayBuffer | Date | Array<any>}  key
 * @return {Promise<any>}
 */
/* istanbul ignore next */
export const add = (store, item, key) =>
  rtop(store.add(item, key))

/**
 * @param {IDBObjectStore} store
 * @param {String | number | ArrayBuffer | Date}  item
 * @return {Promise<number>} Returns the generated key
 */
/* istanbul ignore next */
export const addAutoKey = (store, item) =>
  rtop(store.add(item))

/**
 * @param {IDBObjectStore} store
 * @param {IDBKeyRange} [range]
 */
/* istanbul ignore next */
export const getAll = (store, range) =>
  rtop(store.getAll(range))

/**
 * @param {IDBObjectStore} store
 * @param {IDBKeyRange} [range]
 */
/* istanbul ignore next */
export const getAllKeys = (store, range) =>
  rtop(store.getAllKeys(range))

/**
 * @typedef KeyValuePair
 * @type {Object}
 * @property {any} k key
 * @property {any} v Value
 */

/**
 * @param {IDBObjectStore} store
 * @param {IDBKeyRange} [range]
 * @return {Promise<Array<KeyValuePair>>}
 */
/* istanbul ignore next */
export const getAllKeysValues = (store, range) =>
  // @ts-ignore
  promise.all([getAllKeys(store, range), getAll(store, range)]).then(([ks, vs]) => ks.map((k, i) => ({ k, v: vs[i] })))

/**
 * @param {any} request
 * @param {function(IDBCursorWithValue):void} f
 * @return {Promise<void>}
 */
/* istanbul ignore next */
const iterateOnRequest = (request, f) => promise.create((resolve, reject) => {
  /* istanbul ignore next */
  request.onerror = reject
  /**
   * @param {any} event
   */
  request.onsuccess = event => {
    const cursor = event.target.result
    if (cursor === null) {
      return resolve()
    }
    f(cursor)
    cursor.continue()
  }
})

/**
 * Iterate on keys and values
 * @param {IDBObjectStore} store
 * @param {IDBKeyRange|null} keyrange
 * @param {function(any,any):void} f Callback that receives (value, key)
 */
/* istanbul ignore next */
export const iterate = (store, keyrange, f) =>
  iterateOnRequest(keyrange !== null ? store.openCursor(keyrange) : store.openCursor(), cursor => f(cursor.value, cursor.key))

/**
 * Iterate on the keys (no values)
 *
 * @param {IDBObjectStore} store
 * @param {IDBKeyRange|null} keyrange
 * @param {function(any):void} f callback that receives the key
 */
/* istanbul ignore next */
export const iterateKeys = (store, keyrange, f) =>
  iterateOnRequest(keyrange !== null ? store.openKeyCursor(keyrange) : store.openKeyCursor(), cursor => f(cursor.key))

/**
 * Open store from transaction
 * @param {IDBTransaction} t
 * @param {String} store
 * @returns {IDBObjectStore}
 */
/* istanbul ignore next */
export const getStore = (t, store) => t.objectStore(store)

/**
 * @param {any} lower
 * @param {any} upper
 * @param {boolean} lowerOpen
 * @param {boolean} upperOpen
 */
/* istanbul ignore next */
export const createIDBKeyRangeBound = (lower, upper, lowerOpen, upperOpen) => IDBKeyRange.bound(lower, upper, lowerOpen, upperOpen)

/**
 * @param {any} upper
 * @param {boolean} upperOpen
 */
/* istanbul ignore next */
export const createIDBKeyRangeUpperBound = (upper, upperOpen) => IDBKeyRange.upperBound(upper, upperOpen)

/**
 * @param {any} lower
 * @param {boolean} lowerOpen
 */
/* istanbul ignore next */
export const createIDBKeyRangeLowerBound = (lower, lowerOpen) => IDBKeyRange.lowerBound(lower, lowerOpen)
