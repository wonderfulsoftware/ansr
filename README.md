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
pnpm -C firebase run dev
```

- Access the web at <http://localhost:47522/?flags=test>
