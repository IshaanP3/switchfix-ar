import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 8080);
const root = new URL(".", import.meta.url).pathname.replace(/^\/(.:\/)/, "$1");
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relative = normalize(pathname).replace(/^([/\\])+/, "");
    let file = join(root, relative || "index.html");
    if (!(await stat(file)).isFile()) file = join(file, "index.html");
    response.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
    response.setHeader("Cache-Control", "no-store");
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`SwitchFix AR is running at http://localhost:${port}`);
});
