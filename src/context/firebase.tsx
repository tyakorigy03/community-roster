// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAoTbCq8EGjCIIDMm0Ku7ZniTHl9x6MH6Y",
  authDomain: "riselinkrwanda-d2c3c.firebaseapp.com",
  projectId: "riselinkrwanda-d2c3c",
  storageBucket: "riselinkrwanda-d2c3c.firebasestorage.app",
  messagingSenderId: "341470184976",
  appId: "1:341470184976:web:5e289a3eb744dd457cec95",
  measurementId: "G-R1519GJJ7K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);