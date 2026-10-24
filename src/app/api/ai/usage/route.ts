import { getAiUsage } from "@/lib/server/aiRateLimit";
import { connection } from "next/server";

export async function GET(request: Request): Promise<Response> {
  await connection();
  return getAiUsage(request);
}
