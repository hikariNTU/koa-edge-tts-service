import { randomBytes } from "node:crypto";

import { WebSocket } from "ws";
import { HttpsProxyAgent } from "https-proxy-agent";

export class EdgeTTS {
  voice;
  lang;
  outputFormat;
  saveSubtitles;
  proxy;
  rate;
  pitch;
  volume;

  constructor({
    voice = "zh-TW-HsiaoYuNeural",
    lang = "zh-TW",
    outputFormat = "audio-24khz-48kbitrate-mono-mp3",
    saveSubtitles = false,
    proxy,
    rate = "fast",
    pitch = "default",
    volume = "default",
  } = {}) {
    this.voice = voice;
    this.lang = lang;
    this.outputFormat = outputFormat;
    this.saveSubtitles = saveSubtitles;
    this.proxy = proxy;
    this.rate = rate;
    this.pitch = pitch;
    this.volume = volume;
  }

  /** @returns {Promise<WebSocket>} */
  async _connectWebSocket() {
    const wsConnect = new WebSocket(
      `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4`,
      {
        host: "speech.platform.bing.com",
        origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.66 Safari/537.36 Edg/103.0.1264.44",
        },
        agent: this.proxy ? new HttpsProxyAgent(this.proxy) : undefined,
      }
    );
    return new Promise((resolve) => {
      wsConnect.on("open", () => {
        wsConnect.send(`Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n
          {
            "context": {
              "synthesis": {
                "audio": {
                  "metadataoptions": {
                    "sentenceBoundaryEnabled": "false",
                    "wordBoundaryEnabled": "true"
                  },
                  "outputFormat": "${this.outputFormat}"
                }
              }
            }
          }
        `);
        resolve(wsConnect);
      });
    });
  }

  async ttsPromise(text) {
    const _wsConnect = await this._connectWebSocket();
    const requestId = randomBytes(16).toString("hex");
    return new Promise((resolve) => {
      let buf = Buffer.from("");
      _wsConnect.on("message", async (data, isBinary) => {
        if (isBinary) {
          const separator = "Path:audio\r\n";
          const index = data.indexOf(separator) + separator.length;
          const audioData = data.subarray(index);
          buf = Buffer.concat([buf, audioData]);
        } else {
          const message = data.toString();
          if (message.includes("Path:turn.end")) {
            resolve(buf.toString("base64"));
          }
        }
      });

      _wsConnect.send(
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n
      ` +
          `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${this.lang}">
        <voice name="${this.voice}">
          <prosody rate="${this.rate}" pitch="${this.pitch}" volume="${this.volume}">
            ${text}
          </prosody>
        </voice>
      </speak>`
      );
    });
  }
}
