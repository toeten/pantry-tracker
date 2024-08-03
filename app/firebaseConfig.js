// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAJsV2gvz-qYs7Z8bRPY3m1UNilUzX1Inw",
  authDomain: "hs-pantry-tracker-b1ee6.firebaseapp.com",
  projectId: "hs-pantry-tracker-b1ee6",
  storageBucket: "hs-pantry-tracker-b1ee6.appspot.com",
  messagingSenderId: "159291269891",
  appId: "1:159291269891:web:b017af2ddc6f5b8a4b3f36"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);

export { storage, db };

