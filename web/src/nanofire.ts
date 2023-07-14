import { DatabaseReference, Query, onValue } from 'firebase/database'
import { useStore } from '@nanostores/react'
import { logger } from '@nanostores/logger'
import { atom, onMount, ReadableAtom } from 'nanostores'

const objectStoreMap = new Map<string, ReadableAtom>()
const listStoreMap = new Map<string, ReadableAtom>()
function getOrCreate<K, V>(map: Map<K, V>, key: K, create: () => V): V {
  if (map.has(key)) {
    return map.get(key)!
  }
  const value = create()
  map.set(key, value)
  return value
}

const stripHost = (url: string) => url.replace(/https?:\/\/[^/]+/, '')

type ObservableResult<T> = {
  data?: T
  status: 'loading' | 'error' | 'success'
  error?: Error
}

function getObjectDataStore(ref: DatabaseReference): any {
  return getOrCreate(objectStoreMap, ref.toString(), () => {
    const store = atom<ObservableResult<any>>({
      status: 'loading',
    })
    onMount(store, () => {
      return onValue(
        ref,
        (snapshot) => {
          store.set({ data: snapshot.val(), status: 'success' })
        },
        (error) => {
          store.set({ status: 'error', error })
        },
      )
    })
    logger({ [stripHost(ref.toString())]: store })
    return store
  })
}

function getListStore(query: Query, options: { idField: string }): any {
  return getOrCreate(objectStoreMap, query.toString(), () => {
    const store = atom<ObservableResult<any[]>>({
      status: 'loading',
    })
    onMount(store, () => {
      return onValue(
        query,
        (snapshot) => {
          if (!snapshot.exists()) {
            store.set({ data: [], status: 'success' })
            return
          }
          const data: any[] = []
          snapshot.forEach((child) => {
            const value = child.val()
            value[options.idField] = child.key
            data.push(value)
          })
          store.set({ data, status: 'success' })
        },
        (error) => {
          store.set({ status: 'error', error })
        },
      )
    })
    logger({ [stripHost(query.toString())]: store })
    return store
  })
}

export function useDatabaseListData<T>(
  query: Query,
  options: { idField: string },
) {
  return useStore(getListStore(query, options)) as ObservableResult<T[]>
}

export function useDatabaseObjectData<T>(ref: DatabaseReference) {
  return useStore(getObjectDataStore(ref)) as ObservableResult<T>
}
