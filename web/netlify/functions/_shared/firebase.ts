import 'google-application-credentials-base64'
import * as admin from 'firebase-admin'

admin.initializeApp({
  databaseURL:
    'https://answerbuzzer-default-rtdb.asia-southeast1.firebasedatabase.app',
})

export { admin }
