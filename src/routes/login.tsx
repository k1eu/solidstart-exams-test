import { Show, createSignal } from "solid-js";
import { Head, Title, useParams, useRouteData } from "solid-start";
import { FormError } from "solid-start/data";
import {
  createServerAction$,
  createServerData$,
  redirect,
} from "solid-start/server";
import { db } from "~/db";
import { createUserSession, getUser, login, register } from "~/db/session";
import { cx } from "~/utils/css";

function validateEmail(username: unknown) {
  if (typeof username !== "string" || username.length < 3) {
    return `Emails must be at least 3 characters long`;
  }
}

function validatePassword(password: unknown) {
  if (typeof password !== "string" || password.length < 6) {
    return `Passwords must be at least 6 characters long`;
  }
}

export function routeData() {
  return createServerData$(async (_, { request }) => {
    if (await getUser(request)) {
      throw redirect("/");
    }
    return {};
  });
}

export default function Login() {
  const data = useRouteData<typeof routeData>();
  const params = useParams();
  const [formType, setFormType] = createSignal<"login" | "register">("login");

  const [loggingIn, { Form }] = createServerAction$(async (form: FormData) => {
    const loginType = form.get("loginType");
    const email = form.get("email");
    const password = form.get("password");
    const redirectTo = form.get("redirectTo") || "/";
    if (
      typeof loginType !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof redirectTo !== "string"
    ) {
      throw new FormError(`Form not submitted correctly.`);
    }

    const fields = { loginType, email, password };
    const fieldErrors = {
      username: validateEmail(email),
      password: validatePassword(password),
    };
    if (Object.values(fieldErrors).some(Boolean)) {
      throw new FormError("Fields invalid", { fieldErrors, fields });
    }

    switch (loginType) {
      case "login": {
        const user = await login({ email, password });
        if (!user) {
          throw new FormError(`Email/Password combination is incorrect`, {
            fields,
          });
        }
        return createUserSession(`${user.id}`, redirectTo);
      }
      case "register": {
        const userExists = await db.user.findUnique({
          where: { email },
        });
        if (userExists) {
          throw new FormError(`User with email ${email} already exists`, {
            fields,
          });
        }
        const user = await register({ email, password });
        if (!user) {
          throw new FormError(
            `Something went wrong trying to create a new user.`,
            {
              fields,
            }
          );
        }
        return createUserSession(`${user.id}`, redirectTo);
      }
      default: {
        throw new FormError(`Login type invalid`, { fields });
      }
    }
  });

  return (
    <>
      <Head>
        <Title>Authenticate ExamApp</Title>
      </Head>
      <main>
        <div class="flex min-h-full flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div class="sm:mx-auto sm:w-full sm:max-w-md">
            <img
              class="mx-auto h-10 w-auto"
              src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
              alt="Your Company"
            />
            <h2 class="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
              Sign in to your account
            </h2>
          </div>

          <div class="mt-10 sm:mx-auto sm:w-full sm:max-w-[480px]">
            <div class="bg-white px-6 py-6 shadow sm:rounded-lg sm:px-12">
              <Form class="flex flex-col gap-6">
                <input
                  type="hidden"
                  name="redirectTo"
                  value={params.redirectTo ?? "/"}
                />
                <fieldset class="flex gap-2 justify-center">
                  <label>
                    <input
                      class="peer hidden"
                      type="radio"
                      name="loginType"
                      value="login"
                      checked={true}
                    />
                    <span class="peer-checked:text-blue-500 peer-checked:font-bold">
                      Login
                    </span>
                  </label>
                  <label>
                    <input
                      class="peer hidden"
                      type="radio"
                      name="loginType"
                      value="register"
                    />
                    <span class="peer-checked:text-blue-500 peer-checked:font-bold">
                      Register
                    </span>
                  </label>
                </fieldset>
                <div>
                  <label
                    for="email"
                    class="block text-sm font-medium leading-6 text-gray-900"
                  >
                    Email address
                  </label>
                  <div class="mt-2">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autocomplete="email"
                      required
                      placeholder="kody@example.com"
                      class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                  <Show when={loggingIn.error?.fieldErrors?.email}>
                    <p role="alert" class="text-red-700">
                      {loggingIn.error.fieldErrors.email}
                    </p>
                  </Show>
                </div>

                <div>
                  <label
                    for="password"
                    class="block text-sm font-medium leading-6 text-gray-900"
                  >
                    Password
                  </label>
                  <div class="mt-2">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autocomplete="current-password"
                      placeholder="twixrox"
                      required
                      class="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                  <Show when={loggingIn.error?.fieldErrors?.password}>
                    <p role="alert" class="text-red-700">
                      {loggingIn.error.fieldErrors.password}
                    </p>
                  </Show>
                </div>

                <div class="flex items-center justify-end">
                  <div class="text-sm leading-6">
                    <a
                      href="#"
                      class="font-semibold text-indigo-600 hover:text-indigo-500"
                    >
                      Forgot password?
                    </a>
                  </div>
                </div>

                <Show when={loggingIn.error}>
                  <p role="alert" class="text-red-700">
                    {loggingIn.error.message}
                  </p>
                </Show>

                <div>
                  <button
                    type="submit"
                    class="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    Sign in
                  </button>
                </div>
              </Form>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
