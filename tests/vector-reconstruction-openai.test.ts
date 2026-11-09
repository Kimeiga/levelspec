import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { createOpenAIReviser } from "../tools/reconstruct-openai.ts";

describe("reconstruction model adapter", () => {
  it("sends the source photograph to a compatible Responses API and accepts structured AML", async () => {
    const aml = "<architecture version=\"1\" id=\"test\"></architecture>";
    let request: Record<string, any> | undefined;
    const server = createServer(async (incoming, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of incoming) chunks.push(Buffer.from(chunk));
      request = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({
        status: "completed",
        output: [{ type: "message", content: [{
          type: "output_text",
          text: JSON.stringify({ aml, rationale: "Synthetic test candidate." }),
        }] }],
      }));
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
      const port = (server.address() as AddressInfo).port;
      const revise = await createOpenAIReviser({
        model: "synthetic-vision-test",
        apiKey: "test-key-never-sent-to-a-real-provider",
        apiUrl: `http://127.0.0.1:${port}`,
        photos: [{ referenceId: "front", filename: "front.png", width: 80, height: 60,
          dataUrl: "data:image/png;base64,dGVzdA==" }],
      });
      const source = await revise({
        iteration: 0, previousSource: "", lastAttempt: null, attempts: [],
      });
      assert.equal(source, aml);
      assert.equal(request?.model, "synthetic-vision-test");
      assert.equal(request?.store, false);
      const input = request?.input?.[0]?.content ?? [];
      assert.ok(input.some((part: any) => part.type === "input_image" &&
        part.image_url === "data:image/png;base64,dGVzdA=="));
      assert.ok(input.some((part: any) => part.type === "input_text" &&
        part.text.includes('image="front.png", width=80, height=60')));
      assert.equal(request?.text?.format?.type, "json_schema");
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close(error => error ? reject(error) : resolve()));
    }
  });
});

type Reply = { status: number; body: string };
async function withServer(replies: Reply[], run: (url: string, count: () => number) => Promise<void>) {
  let served = 0;
  const server = createServer(async (incoming, response) => {
    for await (const _ of incoming) { /* drain */ }
    const reply = replies[Math.min(served++, replies.length - 1)];
    response.writeHead(reply.status, { "content-type": "application/json" });
    response.end(reply.body);
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    await run(`http://127.0.0.1:${(server.address() as AddressInfo).port}`, () => served);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close(error => error ? reject(error) : resolve()));
  }
}
const okReply: Reply = { status: 200, body: JSON.stringify({ status: "completed", output: [{
  type: "message", content: [{ type: "output_text",
    text: JSON.stringify({ aml: "<architecture/>", rationale: "retry test" }) }] }] }) };
const photos = [{ referenceId: "front", filename: "front.png", width: 8, height: 6,
  dataUrl: "data:image/png;base64,dGVzdA==" }];
const request = { iteration: 0, previousSource: "", lastAttempt: null, attempts: [] };

describe("reconstruction model adapter failures", () => {
  it("retries transient provider failures, including non-JSON gateway pages", async () => {
    await withServer([{ status: 502, body: "<html>bad gateway</html>" },
      { status: 429, body: JSON.stringify({ error: { message: "slow down" } }) }, okReply],
    async (apiUrl, count) => {
      const revise = await createOpenAIReviser({ model: "m", apiKey: "k", apiUrl, photos,
        retryDelayMs: 1 });
      assert.equal(await revise(request), "<architecture/>");
      assert.equal(count(), 3);
    });
  });
  it("does not retry a rejected request and reports the provider message", async () => {
    await withServer([{ status: 400, body: JSON.stringify({ error: { message: "bad model" } }) }, okReply],
    async (apiUrl, count) => {
      const revise = await createOpenAIReviser({ model: "m", apiKey: "k", apiUrl, photos,
        retryDelayMs: 1 });
      await assert.rejects(revise(request), /400.*bad model/);
      assert.equal(count(), 1);
    });
  });
  it("gives up after bounded retries with a readable error", async () => {
    await withServer([{ status: 503, body: "upstream down" }], async (apiUrl, count) => {
      const revise = await createOpenAIReviser({ model: "m", apiKey: "k", apiUrl, photos,
        retryDelayMs: 1, maxAttempts: 2 });
      await assert.rejects(revise(request), /503.*upstream down/);
      assert.equal(count(), 2);
    });
  });
  it("reports truncated structured output instead of a JSON parse crash", async () => {
    const truncated: Reply = { status: 200, body: JSON.stringify({ status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output: [{ type: "message", content: [{ type: "output_text", text: "{\"aml\": \"<arch" }] }] }) };
    await withServer([truncated], async apiUrl => {
      const revise = await createOpenAIReviser({ model: "m", apiKey: "k", apiUrl, photos });
      await assert.rejects(revise(request), /incomplete.*max_output_tokens/);
    });
  });
  it("aborts an in-flight request when the run is cancelled", async () => {
    const server = createServer(() => { /* never answers */ });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
      const apiUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const revise = await createOpenAIReviser({ model: "m", apiKey: "k", apiUrl, photos });
      const controller = new AbortController();
      const pending = revise({ ...request, signal: controller.signal });
      setTimeout(() => controller.abort(), 20);
      await assert.rejects(pending, /abort/i);
    } finally {
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
  it("loads its prompt resources independently of the working directory", async () => {
    const previous = process.cwd();
    process.chdir(fileURLToPath(new URL("../src", import.meta.url)));
    try {
      await createOpenAIReviser({ model: "m", apiKey: "k", photos });
    } finally {
      process.chdir(previous);
    }
  });
});

describe("reconstruction model adapter permanent failures", () => {
  it("does not retry an exhausted quota even though it is a 429", async () => {
    await withServer([{ status: 429, body: JSON.stringify({ error: {
      message: "You exceeded your current quota", code: "insufficient_quota" } }) }, okReply],
    async (apiUrl, count) => {
      const revise = await createOpenAIReviser({ model: "m", apiKey: "k", apiUrl, photos, retryDelayMs: 1 });
      await assert.rejects(revise(request), /429.*quota/);
      assert.equal(count(), 1);
    });
  });
  it("rejects a JSON body that is not an object without treating it as a network failure", async () => {
    await withServer([{ status: 200, body: "null" }, okReply], async (apiUrl, count) => {
      const revise = await createOpenAIReviser({ model: "m", apiKey: "k", apiUrl, photos, retryDelayMs: 1 });
      await assert.rejects(revise(request), /non-object/);
      assert.equal(count(), 1);
    });
  });
});
