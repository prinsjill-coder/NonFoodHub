import { startStaticServer } from "../tests/serve-static.mjs";

const listenPort = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const displayHost = host === "127.0.0.1" ? "localhost" : host;

await startStaticServer({
  displayHost,
  host,
  label: "ontwikkelserver",
  listenPort
});
