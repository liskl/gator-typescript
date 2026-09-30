import fs from "fs";
import os from "os";
import path from "path";

export type Config = {
  dbUrl: string;
  currentUserName?: string;
};

export function setUser(userName: string): void {
  const cfg = readConfig();
  cfg.currentUserName = userName;
  writeConfig(cfg);
}

export function readConfig(): Config {
  const raw = fs.readFileSync(getConfigFilePath(), { encoding: "utf-8" });
  return validateConfig(JSON.parse(raw));
}

function getConfigFilePath(): string {
  return path.join(os.homedir(), ".gatorconfig.json");
}

function writeConfig(cfg: Config): void {
  const raw: Record<string, string> = {
    db_url: cfg.dbUrl,
  };
  if (cfg.currentUserName) {
    raw.current_user_name = cfg.currentUserName;
  }
  fs.writeFileSync(getConfigFilePath(), JSON.stringify(raw, null, 2));
}

function validateConfig(rawConfig: any): Config {
  if (!rawConfig || typeof rawConfig.db_url !== "string") {
    throw new Error("config missing db_url");
  }
  const cfg: Config = { dbUrl: rawConfig.db_url };
  if (typeof rawConfig.current_user_name === "string") {
    cfg.currentUserName = rawConfig.current_user_name;
  }
  return cfg;
}
