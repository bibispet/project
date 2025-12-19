import Fastify from "fastify";
import { randomUUID } from "node:crypto";

const app = Fastify({
  logger: false
});

app.get("/health", async () => {
  return {
    ok: true,
    service: "api",
    request_id: randomUUID()
  };
});

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "0.0.0.0";

app
  .listen({ port, host })
  .then(() => {
    console.log(`api listening on http://${host}:${port}`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

