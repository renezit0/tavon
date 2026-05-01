import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(3333),
  API_HOST: z.string().default("0.0.0.0"),
  API_STORAGE: z.enum(["memory", "mysql"]).default("memory"),
  JWT_SECRET: z.string().min(20).default("dev_only_change_this_secret_please"),
  CORS_ORIGIN: z.string().default("http://localhost:5173,http://localhost:5180"),
  APP_PUBLIC_URL: z.string().default("http://localhost:5180"),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_SSL: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  PRINT_SERVICE_URL: z.string().optional()
});

export const env = envSchema.parse(process.env);
