import { defineConfig } from "eslint/config";
import nextConfig from "eslint-config-next";

export default defineConfig([...(Array.isArray(nextConfig) ? nextConfig : [nextConfig])]);
