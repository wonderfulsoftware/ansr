import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

export const firebaseConfig = {
  apiKey: 'AIzaSyDjGDP1PYOhvoyo6c1rj8XjYk-cSp3p7M0',
  authDomain: 'answerbuzzer.firebaseapp.com',
  databaseURL:
    'https://answerbuzzer-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'answerbuzzer',
  storageBucket: 'answerbuzzer.appspot.com',
  messagingSenderId: '299385047876',
  appId: '1:299385047876:web:c6f6cd8a5cc2c5a9a3a511',
  measurementId: 'G-DHM5BJ9BG7',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getDatabase(app)
