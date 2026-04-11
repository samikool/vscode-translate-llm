import * as https from "https";
import * as http from "http";
import * as vscode from "vscode";

export interface OllamaConfig {
  endpoint: string;
  model: string;
  apiKey: string;
}

export function getOllamaConfig(): OllamaConfig {
  const config = vscode.workspace.getConfiguration("vstranslate");
  return {
    endpoint: config.get<string>("ollamaEndpoint", "http://localhost:11434").replace(/\/$/, ""),
    model: config.get<string>("ollamaModel", "llama3"),
    apiKey: config.get<string>("ollamaApiKey", ""),
  };
}

const TRANSLATION_PROMPT = `You are a translation assistant. You will be given a list of lines, one per line, each prefixed with a number and a pipe character (e.g. "1|some text").
Translate each line into English. Output ONLY the translated lines in the exact same format: "N|translated text".
Do not add extra lines, explanations, or blank lines. If a line is already in English, return it unchanged.

Lines to translate:
`;

export interface LineTranslation {
  line: number;
  text: string;
}

export async function translateWithOllama(lines: { line: number; text: string }[]): Promise<LineTranslation[]> {
  const config = getOllamaConfig();
  const url = `${config.endpoint}/api/generate`;

  const numbered = lines.map((l) => `${l.line}|${l.text}`).join("\n");

  const body = JSON.stringify({
    model: config.model,
    prompt: TRANSLATION_PROMPT + numbered,
    stream: false,
  });

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === "https:";
    const transport = isHttps ? https : http;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body).toString(),
    };

    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    const req = transport.request(
      {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname,
        method: "POST",
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Ollama API error ${res.statusCode}: ${data}`));
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const response: string = parsed.response ?? "";
            const result: LineTranslation[] = [];
            for (const raw of response.trim().split("\n")) {
              const idx = raw.indexOf("|");
              if (idx === -1) { continue; }
              const lineNum = parseInt(raw.slice(0, idx), 10);
              const text = raw.slice(idx + 1).trim();
              if (!isNaN(lineNum) && text) {
                result.push({ line: lineNum, text });
              }
            }
            resolve(result);
          } catch {
            reject(new Error(`Failed to parse Ollama response: ${data}`));
          }
        });
      }
    );

    req.on("error", (err) => reject(new Error(`Connection failed: ${err.message}`)));
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("Request timed out after 30s"));
    });

    req.write(body);
    req.end();
  });
}
