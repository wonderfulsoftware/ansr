import 'google-application-credentials-base64'
import { Handler } from '@netlify/functions'
import axios from 'axios'
import { Env } from 'lazy-strict-env'
import { z } from 'zod'
import * as admin from 'firebase-admin'

admin.initializeApp({
  databaseURL:
    'https://answerbuzzer-default-rtdb.asia-southeast1.firebasedatabase.app',
})

const env = Env(
  z.object({
    LINE_LOGIN_CLIENT_ID: z.string(),
    LINE_LOGIN_CLIENT_SECRET: z.string(),
  }),
)

// Handle LINE Login OAuth callback
export const handler: Handler = async (event, context) => {
  const params = event.queryStringParameters!
  if (params.error) {
    return {
      statusCode: 400,
      body: 'Authorization request is unsuccessful :(',
    }
  }

  const code = params.code

  // Infer redirect URI from request Host header
  const host = String(event.headers.host)
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const redirectUri = `${protocol}://${host}/.netlify/functions/line-login`

  if (!code) {
    // Redirect to LINE Login
    const authorizeUrl = `https://access.line.me/oauth2/v2.1/authorize?${new URLSearchParams(
      {
        response_type: 'code',
        client_id: env.LINE_LOGIN_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: 'profile',
        state: '-',
      },
    )}`
    return {
      statusCode: 302,
      headers: {
        location: authorizeUrl,
      },
      body: '',
    }
  }

  // Exchange code for access token
  const accessToken = (
    await axios.post(
      'https://api.line.me/oauth2/v2.1/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: env.LINE_LOGIN_CLIENT_ID,
        client_secret: env.LINE_LOGIN_CLIENT_SECRET,
      }),
    )
  ).data.access_token

  const profile = (
    await axios.get('https://api.line.me/v2/profile', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  ).data

  const uid = profile.userId

  // Try to create a user
  try {
    await admin.auth().createUser({
      uid,
      displayName: profile.displayName,
      photoURL: profile.pictureUrl,
    })
  } catch (e: any) {
    // Update the user if it already exists
    if (e.code === 'auth/uid-already-exists') {
      await admin.auth().updateUser(uid, {
        displayName: profile.displayName,
        photoURL: profile.pictureUrl,
      })
    } else {
      throw e
    }
  }

  // Create a custom token
  const customToken = await admin.auth().createCustomToken(uid)

  // Return an HTML page that will redirect to the app,
  // injecting the custom token into the sessionStorage.
  return {
    statusCode: 200,
    headers: {
      'content-type': 'text/html',
    },
    body: `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Redirecting...</title>
    <script>
      sessionStorage.setItem('firebaseCustomToken', ${JSON.stringify(
        customToken,
      )})
      location.replace('/')
    </script>
  </head>
  <body style="font-family: sans-serif">
    Redirecting...
  </body>
</html>`,
  }
}
