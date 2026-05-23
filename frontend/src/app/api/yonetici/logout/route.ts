import { NextResponse } from "next/server";
import { MANAGER_COOKIE } from "@/lib/manager-session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(MANAGER_COOKIE);
  return response;
}
