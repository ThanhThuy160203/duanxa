import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDeOdF-8qGfD75UW2OBW3CD0VGf2iIeG60",
  authDomain: "duan-a5c85.firebaseapp.com",
  projectId: "duan-a5c85",
  storageBucket: "duan-a5c85.firebasestorage.app",
  messagingSenderId: "70684256342",
  appId: "1:70684256342:web:9705cc665600b0acd3b3f7",
  measurementId: "G-S82ZC0Y9B9"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);