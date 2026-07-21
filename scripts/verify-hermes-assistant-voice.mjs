import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { writeFile } from "node:fs/promises";
import { synthesizeHermesSpeech } from "../server/hermes-speech.mjs";
import { transcribeHermesAudio } from "../server/hermes-transcription.mjs";
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

const mp3Fixture = Buffer.from("ID3-hermes-edge-voice", "ascii");
const edgeResult = await synthesizeHermesSpeech("Мягкий голос", {
  url: `http://127.0.0.1:${address.port}/synthesize`,
  edgeTtsBin: "/opt/edge-tts",
  timeoutMs: 2000,
  maxAudioBytes: 1024,
  execFileImpl: async (command, args) => {
    assert.equal(command, "/opt/edge-tts");
    assert.ok(args.includes("en-US-AndrewMultilingualNeural"));
    const outputPath = args[args.indexOf("--write-media") + 1];
    await writeFile(outputPath, mp3Fixture);
  },
});

assert.equal(edgeResult.ok, true);
assert.equal(edgeResult.contentType, "audio/mpeg");
assert.equal(edgeResult.provider, "edge-tts");
assert.deepEqual(edgeResult.audio, mp3Fixture);

mockPiper.close();
await once(mockPiper, "close");

let transcriptionRequest = null;
const mockWhisper = http.createServer(async (request, response) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  transcriptionRequest = {
    url: request.url,
    contentType: request.headers["content-type"],
    body: Buffer.concat(chunks),
  };
  const payload = '{"language":"ru","segments":[{"text":" \\u041a\\u0430\\u043a\\u0438\\u0435"}],"text":" \\u041a\\u0430\\u043a\\u0438\\u0435 \\u0437\\u0430\\u0434\\u0430\\u0447\\u0438 \\u0441\\u0435\\u0439\\u0447\\u0430\\u0441 \\u0441\\u0430\\u043c\\u044b\\u0435 \\u0432\\u0430\\u0436\\u043d\\u044b\\u0435?"}';
  response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Content-Length": Buffer.byteLength(payload) });
  response.end(payload);
});

mockWhisper.listen(0, "127.0.0.1");
await once(mockWhisper, "listening");
const whisperAddress = mockWhisper.address();
const transcription = await transcribeHermesAudio(Buffer.from("voice-fixture"), {
  url: `http://127.0.0.1:${whisperAddress.port}/asr`,
  contentType: "audio/webm",
  filename: "voice.webm",
  timeoutMs: 2000,
});

assert.equal(transcription.ok, true);
assert.equal(transcription.text, "Какие задачи сейчас самые важные?");
assert.match(transcriptionRequest.url, /language=ru/);
assert.match(transcriptionRequest.url, /vad_filter=true/);
assert.match(transcriptionRequest.contentType, /^multipart\/form-data; boundary=/);
assert.ok(transcriptionRequest.body.length > Buffer.byteLength("voice-fixture"));

mockWhisper.close();
await once(mockWhisper, "close");

console.log("Hermes voice verification passed.");
