import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import 'bootstrap/dist/css/bootstrap.min.css'
import { FirebaseAppProvider, AuthProvider, DatabaseProvider } from 'reactfire'
import './index.css'
import { app, auth, db } from './firebase'
import { signInWithCustomToken } from 'firebase/auth'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <FirebaseAppProvider firebaseApp={app}>
      <AuthProvider sdk={auth}>
        <DatabaseProvider sdk={db}>
          <App />
        </DatabaseProvider>
      </AuthProvider>
    </FirebaseAppProvider>
  </React.StrictMode>,
)

if (sessionStorage.firebaseCustomToken) {
  signInWithCustomToken(auth, sessionStorage.firebaseCustomToken)
  sessionStorage.firebaseCustomToken = ''
}
