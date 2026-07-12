# Examples — `@flowmails/sdk` v0.1

All four snippets are drop-in. They assume the user has
`FLOWMAILS_API_KEY` set in their environment. They assume the user
has already minted a key in
`https://flowmails.net/dashboard/settings/api-keys` and knows the
domain that key is bound to.

## Express

```ts
import express from "express";
import { Flowmails } from "@flowmails/sdk";

const fm = new Flowmails({ apiKey: process.env.FLOWMAILS_API_KEY! });

const app = express();
app.use(express.json());

app.post("/notify", async (req, res) => {
  const { id } = await fm.send({
    from: "alerts@yourdomain.com",
    to: req.body.to,
    subject: req.body.subject,
    text: req.body.text,
  });
  res.json({ id });
});

app.listen(3000);
```

## Hono (any runtime)

```ts
import { Hono } from "hono";
import { Flowmails } from "@flowmails/sdk";

const fm = new Flowmails({ apiKey: process.env.FLOWMAILS_API_KEY! });
const app = new Hono();

app.post("/notify", async (c) => {
  const { id } = await fm.send({
    from: "alerts@yourdomain.com",
    to: (await c.req.json()).to,
    subject: "Hello",
    text: "Hi!",
  });
  return c.json({ id });
});

export default app;
```

## Next.js — Route Handler (App Router)

```ts
// (lives under app/<your-segment>/route.ts in the Next.js project)
import { NextResponse } from "next/server";
import { Flowmails } from "@flowmails/sdk";

const fm = new Flowmails({ apiKey: process.env.FLOWMAILS_API_KEY! });

export async function POST(request: Request) {
  const body = await request.json();
  const { id } = await fm.send({
    from: "alerts@yourdomain.com",
    to: body.to,
    subject: body.subject,
    text: body.text,
  });
  return NextResponse.json({ id });
}
```

## Next.js — Server Action

```ts
// app/actions/notify.ts
"use server";
import { Flowmails } from "@flowmails/sdk";

const fm = new Flowmails({ apiKey: process.env.FLOWMAILS_API_KEY! });

export async function notify(formData: FormData) {
  await fm.send({
    from: "alerts@yourdomain.com",
    to: String(formData.get("to") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    text: String(formData.get("body") ?? ""),
  });
}
```

## Cloudflare Workers

```ts
// src/index.ts
import { Flowmails } from "@flowmails/sdk";

export interface Env {
  FLOWMAILS_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    const body = (await request.json()) as {
      to: string;
      subject: string;
      text: string;
    };
    const fm = new Flowmails({ apiKey: env.FLOWMAILS_API_KEY });
    const { id } = await fm.send({
      from: "alerts@yourdomain.com",
      to: body.to,
      subject: body.subject,
      text: body.text,
    });
    return Response.json({ id });
  },
};
```

The SDK uses the runtime's global `fetch`, so no `fetch` option is
needed. Pass one explicitly if you want to attach `ctx.waitUntil` or
inject a custom middleware.
