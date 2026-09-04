import { InjectionToken } from '@angular/core';
import { getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

import { FIREBASE_CONFIG } from './firebase-config';
import { GroupStore, browserLogCache } from './group-store';
import { UsageGuard, browserUsageStore } from './usage-guard';

/**
 * O Firebase só é inicializado quando alguém entra num grupo. A porta e a prateleira não
 * tocam em rede, e quem nunca abrir uma máquina não paga o custo de conexão.
 */

let store: GroupStore | null = null;
let guard: UsageGuard | null = null;

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

export function usageGuard(): UsageGuard {
  guard ??= new UsageGuard(browserUsageStore(storage()));
  return guard;
}

function useEmulator(): boolean {
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  return local && new URLSearchParams(location.search).get('emu') === '1';
}

export function groupStore(): GroupStore {
  if (store) return store;

  const app = getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
  const db: Firestore = getFirestore(app);
  const auth: Auth = getAuth(app);

  // Desenvolvimento contra o emulador, só em localhost e só quando pedido: `?emu=1`.
  if (useEmulator()) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  store = new GroupStore(db, auth, usageGuard(), browserLogCache(storage()));
  return store;
}

/**
 * Injetados em vez de importados: assim um teste consegue trocar a loja por uma falsa,
 * e o componente deixa de exigir Firebase só para ser renderizado.
 */
export const GROUP_STORE = new InjectionToken<GroupStore>('GroupStore', {
  providedIn: 'root',
  factory: () => groupStore(),
});

export const USAGE_GUARD = new InjectionToken<UsageGuard>('UsageGuard', {
  providedIn: 'root',
  factory: () => usageGuard(),
});
