import http from "node:http";
import { Readable } from "node:stream";
import entry from "./dist/server/server.js";

const port = Number(process.env.PORT ?? 3000);

const server = http.createServer(async (req, res) => {
  try {
    const origin = `http://${req.headers.host ?? `localhost:${port}`}`;
    const url = new URL(req.url ?? "/", origin);
    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        for (const item of value) {
          headers.append(key, item);
        }
      } else if (typeof value === "string") {
        headers.set(key, value);
      }
    }

    const request = new Request(url, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : Readable.toWeb(req),
      duplex: "half",
    });

    const response = await entry.fetch(request);
    res.statusCode = response.status;

    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    if (!response.body) {
      res.end();
      return;
    }

    Readable.fromWeb(response.body).pipe(res);
  } catch (error) {
    res.statusCode = 500;
    res.end(error instanceof Error ? error.message : "Unknown server error");
  }
});

server.listen(port, () => {
  console.log(`TanStack Start listening on http://localhost:${port}`);
});
