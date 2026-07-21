import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { synthesizeHermesSpeech } from "../server/hermes-speech.mjs";
import { prepareHermesSpeechText, resolveRecognizedSpeech } from "../src/modules/analytics/utils/hermesVoice.js";

assert.equal(
  resolveRecognizedSpeech("", "Голосовой вопрос ещё промежуточный"),
  "Голосовой вопрос ещё промежуточный",
  "interim speech must be sent when the browser never marks it final",
);
assert.equal(resolveRecognizedSpeech("Финальный вопрос", ""), "Финальный вопрос");
assert.equal(
  resolveRecognizedSpeech("Уже финальная часть", "Уже финальная часть и последний промежуточный фрагмент"),
  "Уже финальная часть и последний промежуточный фрагмент",
);
assert.equal(
  prepareHermesSpeechText("**Ответ**: [документ](https://example.com) `готов`."),
  "Ответ : документ готов.",
);

let receivedBody = null;
const wavFixture = Buffer.from("RIFF0000WAVEfmt ", "ascii");
const mockPiper = http.createServer(async (request, response) => {
  let body = "";
  for await (const chunk of request) body += chunk;
  receivedBody = JSON.parse(body || "{}");
  response.writeHead(200, { "Content-Type": "audio/wav", "Content-Length": wavFixture.length });
  response.end(wavFixture);
});

mockPiper.listen(0, "127.0.0.1");
await once(mockPiper, "listening");
const address = mockPiper.address();
const result = await synthesizeHermesSpeech("Спокойный ответ", {
  url: `http://127.0.0.1:${address.port}/synthesize`,
  timeoutMs: 2000,
  maxAudioBytes: 1024,
});

assert.equal(result.ok, true);
assert.deepEqual(result.audio, wavFixture);
assert.deepEqual(receivedBody, { text: "Спокойный ответ", length_scale: 1.12 });

mockPiper.close();
await once(mockPiper, "close");

console.log("Hermes voice verification passed.");
