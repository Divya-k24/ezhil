import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
   apiKey: "AIzaSyCcaiyhjEsJ6dssINWwbdv-VCiHfREtT6g",
  authDomain: "ezhil-c7dbc.firebaseapp.com",
  projectId: "ezhil-c7dbc",
  storageBucket: "ezhil-c7dbc.firebasestorage.app",
  messagingSenderId: "387061641056",
  appId: "1:387061641056:web:cfa7066c5a704fc0ed3805"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);