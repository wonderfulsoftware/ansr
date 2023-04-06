import 'google-application-credentials-base64'
import * as admin from 'firebase-admin'

admin.initializeApp({
  databaseURL: process.env.FIREBASE_DATABASE_EMULATOR_HOST
    ? `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST}?ns=demo-ansr-default-rtdb`
    : 'https://answerbuzzer-default-rtdb.asia-southeast1.firebasedatabase.app',
})

export { admin }
