"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, computeToken } from "@/lib/admin-auth";

export async function login(
  _: unknown,
  formData: FormData
): Promise<{ error: string } | never> {
  const password = formData.get("password") as string;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return { error: "서버 설정 오류입니다. ADMIN_PASSWORD를 확인하세요." };
  }

  if (!password || password !== adminPassword) {
    return { error: "비밀번호가 올바르지 않습니다." };
  }

  const token = await computeToken(adminPassword);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7일
    path: "/",
  });

  redirect("/admin");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
