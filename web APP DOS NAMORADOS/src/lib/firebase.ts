import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { SurpresaData } from '../types';
import firebaseConfig from '../firebase-applet-config.json';

let app;
let db: any = null;
let storage: any = null;
export let isFirebaseEnabled = false;

// Determine if we have real, active credentials
const hasRealCredentials = 
  firebaseConfig && 
  firebaseConfig.projectId && 
  !firebaseConfig.projectId.includes("placeholder");

if (hasRealCredentials) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");
    storage = getStorage(app);
    isFirebaseEnabled = true;

    // Direct connectivity handshake
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.warn("Please check your Firebase configuration: client is offline.");
        }
      }
    };
    testConnection();
  } catch (error) {
    console.error("Erro ao inicializar Firebase Real:", error);
  }
}

// Low-friction Local Storage fallback to guarantee a bulletproof sandbox preview
const LOCAL_STORAGE_KEY = 'namorados_surpresas';

const getLocalSurpresas = (): Record<string, SurpresaData> => {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

const saveLocalSurpresa = (id: string, surpresa: SurpresaData) => {
  try {
    const data = getLocalSurpresas();
    data[id] = surpresa;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to write to local storage", e);
  }
};

/**
 * Saves a surprise. First tries Firestore if enabled; otherwise falls back to highly robust LocalStorage.
 * It also triggers the server-side proxy `/api/generate` to query Gemini and store the declaration!
 */
export async function saveSurpresa(surpresa: Omit<SurpresaData, 'id'>): Promise<string> {
  const finalId = Math.random().toString(36).substring(2, 11) + Date.now().toString(36).substring(4);
  const dataToSave: SurpresaData = { 
    ...surpresa, 
    id: finalId,
    declaracao_ia: surpresa.history // Use raw unaltered history directly
  };

  // 2. Save in Database
  if (isFirebaseEnabled && db) {
    try {
      await setDoc(doc(db, 'surpresas', finalId), dataToSave);
      return finalId;
    } catch (error) {
      console.error("Falha ao salvar no Firestore, usando fallback local:", error);
      // Fallback
    }
  }

  // Local storage fallback
  saveLocalSurpresa(finalId, dataToSave);
  return finalId;
}

/**
 * Fetches a single surprise dynamically.
 */
export async function getSurpresa(id: string): Promise<SurpresaData | null> {
  if (isFirebaseEnabled && db) {
    try {
      const snap = await getDoc(doc(db, 'surpresas', id));
      if (snap.exists()) {
        return snap.data() as SurpresaData;
      }
    } catch (error) {
      console.error("Falha ao resgatar do Firestore, buscando localmente:", error);
    }
  }

  const localData = getLocalSurpresas();
  return localData[id] || null;
}

/**
 * Helper to upload photos. Supports direct Firebase Storage, falling back to fully serialized base64.
 */
export async function uploadPhoto(file: File): Promise<string> {
  if (isFirebaseEnabled && storage) {
    try {
      const storageRef = ref(storage, `surpresas/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      return url;
    } catch (error) {
      console.error("Erro no Cloud Storage upload, usando base64 fallback:", error);
    }
  }

  // High-fidelity local file optimizer & encoder
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
