import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/database";
import "firebase/compat/storage";

const firebaseConfig = {
  apiKey: "AIzaSyConnPyZJMfbOwkkdqPaR0rVjEYWn1MnR0",
  authDomain: "gomart-e2eae.firebaseapp.com",
  databaseURL: "https://gomart-e2eae-default-rtdb.firebaseio.com",
  projectId: "gomart-e2eae",
  storageBucket: "gomart-e2eae.firebasestorage.app",
  messagingSenderId: "1080581604267",
  appId: "1:1080581604267:web:c7cd2b3addac3fe3aa88ee",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const app = firebase;
export const auth = firebase.auth();
export const database = firebase.database();
export const storage = firebase.storage();
export default firebase; // ✅ Ajout pour accéder aux constructeurs
