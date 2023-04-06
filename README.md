# ansr
?????

## Develop locally

```sh
# Tab 1 - Firebase Emulators
pnpm -C firebase exec firebase emulators:start --project demo-ansr

# Tab 2 - Netlify Dev
pnpm -C web exec netlify dev --target-port 47522 --offline

# Tab 3 - Deno
deno run --allow-env --allow-net ./bot/main.ts
```
