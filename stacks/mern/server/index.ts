import "dotenv/config";
import { createApp } from "./create-app.ts";

const port = Number(process.env.PORT ?? 4020);
const app = await createApp();

app.listen(port, () => {
  console.log(`[server] listening on http://localhost:${port}`);
});
