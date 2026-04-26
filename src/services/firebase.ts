import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Timestamp,
  serverTimestamp,
  getDocFromServer,
  getDocs
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error: any) {
    console.error("Login failed:", error);
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/popup-blocked') {
      alert("Popup blocked! Please allow popups for this site to sign in.");
    } else if (error.code === 'auth/cancelled-popup-request') {
      // Ignored
    } else {
      alert(`Login failed: ${error.message || "Unknown error"}`);
    }
    throw error;
  }
};
export const logout = () => signOut(auth);

// --- Error Handling ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Connection Test ---
export async function testConnection() {
  try {
    // Attempt to read a non-existent doc to test connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error.message && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
    // Permission denied is also a valid "connection" in terms of reaching the server
  }
}

// --- Conversation Helpers ---
export const createConversation = async (userId: string, title: string) => {
  const conversationsRef = collection(db, 'conversations');
  const now = serverTimestamp();
  const docRef = await addDoc(conversationsRef, {
    userId,
    title,
    createdAt: now,
    updatedAt: now
  });
  return docRef.id;
};

export const saveMessage = async (
  conversationId: string, 
  role: string, 
  content: string, 
  type: string = 'text', 
  imageUrl?: string, 
  files?: any[],
  groundingUrls?: any[]
) => {
  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  await addDoc(messagesRef, {
    conversationId,
    role,
    content,
    type,
    imageUrl: imageUrl || null,
    files: files || null,
    groundingUrls: groundingUrls || null,
    createdAt: serverTimestamp()
  });
};
