import { redirect } from "solid-start/server";
import { createCookieSessionStorage } from "solid-start/session";
import { db } from ".";
import { users } from "./schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt-ts";

type LoginForm = {
  email: string;
  password: string;
};

export async function register({ email, password }: LoginForm) {
  const encryptedPassword = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(users)
    .values({
      email,
      encryptedPassword: password,
    })
    .returning();
  return user;
}

export async function login({ email, password }: LoginForm) {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });
  if (!user) return null;
  const isCorrectPassword = await bcrypt.compare(
    password,
    user.encryptedPassword
  );
  if (!isCorrectPassword) return null;
  return user;
}

//@ts-expect-error TODO: add types
const sessionSecret = import.meta.env.SESSION_SECRET;

console.log({ sessionSecret });

const storage = createCookieSessionStorage({
  cookie: {
    name: "RJ_session",
    // secure doesn't work on localhost for Safari
    // https://web.dev/when-to-use-local-https/
    secure: true,
    secrets: ["hello"],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});

export function getUserSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") return null;
  return userId;
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (typeof userId !== "string") {
    return null;
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, parseInt(userId)),
    });
    return user;
  } catch {
    throw logout(request);
  }
}

export async function logout(request: Request) {
  const session = await storage.getSession(request.headers.get("Cookie"));
  return redirect("/login", {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
}

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await storage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}
