import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, collection, addDoc, setDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, getDoc, writeBatch, where, getDocs } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  collection, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp, 
  getDoc,
  writeBatch,
  where,
  getDocs,
  signInWithPopup,
  signOut,
  onAuthStateChanged
};

export type { User };

export async function checkIsAdmin(uid: string, email?: string | null, emailVerified?: boolean) {
  // Sync with firestore.rules: Only consider admin if email is verified
  if (email && email.toLowerCase() === 'nuruddinfahad86@gmail.com' && emailVerified) return true;

  try {
    const adminDoc = await getDoc(doc(db, 'admins', uid));
    return adminDoc.exists();
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, shouldThrow: boolean = true) {
  const message = error instanceof Error ? error.message : String(error);
  const isQuotaError = message.toLowerCase().includes('quota') || 
                       message.toLowerCase().includes('মেমরি লিমিট') ||
                       message.toLowerCase().includes('limit exceeded');
  
  const errInfo: any = {
    error: isQuotaError ? "দুঃখিত! আজকের জন্য আমাদের মেমরি লিমিট (Quota) শেষ হয়ে গেছে। আগামীকাল আবার চেষ্টা করুন।" : message,
    operationType,
    path,
    userId: auth.currentUser?.uid,
    email: auth.currentUser?.email
  };
  
  if (isQuotaError) {
    console.error('CRITICAL: Firestore Quota Exceeded. Please check your Firestore limits.');
  }

  const errString = `Firestore Error [${operationType}] at ${path}: ${errInfo.error}`;
  console.error(errString, errInfo);
  
  if (shouldThrow) {
    throw new Error(errString);
  }
  return errString;
}
