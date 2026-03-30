import "server-only";
import { randomUUID } from "node:crypto";
import { addDays } from "date-fns";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/server/db";

const SESSION_COOKIE_NAME = "kanban-tcc-session";

async function setSessionCookie(sessionToken: string, expiresAt: Date) {
  const cookieStore = await cookies();

  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    return null;
  }

  const session = await db.session.findUnique({
    where: {
      sessionToken,
    },
    include: {
      user: true,
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.session.delete({
        where: {
          id: session.id,
        },
      });
    }
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function createUserSession(userId: string) {
  const expiresAt = addDays(new Date(), 14);

  const session = await db.session.create({
    data: {
      userId,
      sessionToken: randomUUID(),
      expiresAt,
    },
  });

  await setSessionCookie(session.sessionToken, session.expiresAt);
}

export async function destroyUserSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    await db.session.deleteMany({
      where: {
        sessionToken,
      },
    });
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
}
