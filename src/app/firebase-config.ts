/**
 * Configuração pública do app web. Isto NÃO é segredo: qualquer pessoa que abra o site
 * enxerga esses valores, e é assim que o Firebase funciona. A segurança está inteira nas
 * security rules (`firestore.rules`), que são testadas em `tests/firestore-rules.test.mjs`.
 *
 * O projeto vive no plano Spark, sem faturamento. Ver FIREBASE.md.
 */
export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAsxN0i-2pGuoVKFTLxKbJBHPshHYSszbk',
  authDomain: 'sorteador-ed1c9.firebaseapp.com',
  projectId: 'sorteador-ed1c9',
  appId: '1:114973377178:web:c5aac962d52bd707419523',
  messagingSenderId: '114973377178',
} as const;
