import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { createOpenAIReviser } from "../tools/reconstruct-openai.ts";

describe("reconstruction model adapter", () => {
  it("sends the source photograph to a compatible Responses API and accepts structured SVGX", async () => {
    const svgx = "<level version=\"2\" id=\"test\"></level>";
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
          text: JSON.stringify({ svgx, rationale: "Synthetic test candidate." }),
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
      assert.equal(source, svgx);
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
