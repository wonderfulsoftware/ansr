# ansr

**ansr** is a tool for creating live quizzes. It is intended for use in live events with many audiences. Audience members can answer multiple choice questions using their mobile phones through a LINE bot. This tool is currently in PoC stage. It only provides a bot that audience members can use to answer questions, and a web interface to view the results and calculate the score. You are expected to create your own slides and questions. Feel free to try it out and contribute!

## How to use

1. **Quiz creator creates a room.**

   - Go to <https://ansr.netlify.app/>
   - Log in with LINE
   - Click **Create a new room**
   - The information for joining the room will be displayed (LINE ID, room ID, and a QR code)

2. **Audience members join the room.**

   - Audience use their mobile code to scan the QR code, or add the LINE ID as a friend and send the room ID to the bot.

3. **Quiz creator creates a question.**

   - Click on **+ Question** button.
   - Turn on the **Active & accepting answers** switch.

4. **Audience members answer the question.**

   - Audience members type a number (1, 2, 3, or 4) to answer the question.

5. **Quiz creator ends the question.**

   - Turn off the **Active & accepting answers** switch.
   - Tick the checkboxes of the correct answers.
   - Turn on the **Show answers** switch to see how many people answered each choice, and how much score each person gets in the round.
   - The first person who sends the correct answer gets 100 points, the second person gets 99 points, and so on.

6. **At the end, quiz creator can see the final score.**

   - Click on the **Leaderboard** tab.

## Develop locally

```sh
# Tab 1 - Web
pnpm -C web run dev

# Tab 2 - Functions
pnpm -C backend run dev

# Tab 3 - Firebase Emulators
pnpm run emulators
```

Access the web at <http://localhost:47522/?flags=test>

- The `?flags=test` instructs the web to use the local Firebase emulators instead of the production Firebase project.

## Develop with a LINE Bot and LINE Login

You need to create:

- LINE Login channel
- Messaging API channel

Create `backend/.env` with the following content:

```sh
# Obtain value from LINE Login channel
LINE_LOGIN_CLIENT_ID=
LINE_LOGIN_CLIENT_SECRET=

# Obtain value from Messaging API channel
LINE_CHANNEL_ACCESS_TOKEN=

# Generate a random string with `openssl rand -hex 32`
LINE_WEBHOOK_SECRET_KEY=
```

Run a reverse proxy to forward requests to the local Firebase functions emulator:

```sh
# Example: Using Cloudflare Tunnel
cloudflared tunnel --url http://localhost:5001
```

Update the webhook URL in the LINE Messaging API channel settings to the URL of the reverse proxy:

```
https://<domain>/demo-ansr/asia-southeast1/line?key=<LINE_WEBHOOK_SECRET_KEY>
```

### Deploying rich menus

```sh
pnpm -C backend exec tsx scripts/updateRichMenu.ts
```
