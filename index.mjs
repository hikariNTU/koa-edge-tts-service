// @ts-check
import Koa from "koa";

import { bodyParser } from "@koa/bodyparser";
import Cors from "@koa/cors";
import Router from "@koa/router";

import { v4 as uuid } from "uuid";
import { EdgeTTS } from "./tts.mjs";

const app = new Koa();
const router = new Router();

router.post("/tts", async (ctx) => {
  const /** @type {string | undefined} */ text = ctx.request.body?.input?.text;

  if (!text) {
    console.warn("No text");
    ctx.response.body = "text?";
    ctx.response.status = 400;
    return;
  } else {
    console.log(`Generate: ${text.slice(0, 10)}...[${text.length}]`);
  }

  const id = uuid();
  const now = Date.now();
  const tts = new EdgeTTS();
  const base64 = await tts.ttsPromise(text);

  console.log(`Generated: ${Date.now() - now} ms`);

  ctx.body = JSON.stringify({
    uid: id,
    inputText: text,
    inputType: "text",
    voiceModel: "female_1",
    voiceLang: "zh_tw",
    audioEncoding: "MP3",
    audioMaxLength: 600000,
    status: "completed",
    audioFile: {
      fileName: "",
      fileHash: "",
      url: "",
      expiredAt: "",
      errorMessage: "",
      audioContent: base64,
    },
  });
});

app
  .use(Cors())
  .use(bodyParser())
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(8000);
