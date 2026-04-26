import { cookies } from "next/headers";

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session?.value) return null;

    return JSON.parse(session.value);
  } catch (err) {
    console.error("AUTH PARSE ERROR:", err);
    return null;
  }
}