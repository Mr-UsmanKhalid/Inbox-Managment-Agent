import { app, warmUp } from "../src/server.ts";

let initialized = false;

export default async function handler(req: any, res: any) {
  if (!initialized) {
    initialized = true;
    await warmUp();
  }

  return app(req, res);
}