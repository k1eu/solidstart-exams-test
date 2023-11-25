import { Params } from "@solidjs/router";
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
import { z } from "zod";
import { eq } from "drizzle-orm";
import { users } from "~/db/schema";

const AuthType = z.enum(["login", "register"]);

const AuthFormSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" }),
});

export function routeData() {
  return createServerData$(async (_, { request }) => {
    if (await getUser(request)) {
      throw redirect("/");
    }
    return {};
  });
}

export default function Login() {
  const params = useParams();

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
              <LoginForm params={params} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function LoginForm({ params }: { params: Params }) {
  const [loggingIn, { Form }] = createServerAction$(async (form: FormData) => {
    const formAuthType = form.get("authType");
    const formEmail = form.get("email");
    const formPassword = form.get("password");
    const redirectTo = "/";

    const formValues = AuthFormSchema.safeParse({
      email: formEmail,
      password: formPassword,
    });

    const typeValue = AuthType.safeParse(formAuthType);

    if (!typeValue.success) {
      throw new FormError("Login type invalid", {
        fields: {
          loginType: formAuthType,
        },
      });
    }

    if (!formValues.success) {
      throw new FormError("Fields invalid", {
        fieldErrors: {
          password: formValues.error.errors.find(
            (e) => e.path[0] === "password"
          )?.message,
          email: formValues.error.errors.find((e) => e.path[0] === "email")
            ?.message,
        },
        fields: {
          email: formEmail,
          password: formPassword,
        },
      });
    }

    const loginType = typeValue.data;
    const fields = formValues.data;
    const { email, password } = fields;

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
        const userExists = await db.query.users.findFirst({
          where: eq(users.email, email),
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
    <Form class="flex flex-col gap-6">
      <input type="hidden" name="redirectTo" value={params.redirectTo ?? "/"} />
      <fieldset class="flex gap-2 justify-center">
        <label>
          <input
            class="peer hidden"
            type="radio"
            name="authType"
            value="login"
            checked={true}
          />
          <span class="peer-checked:text-blue-500 peer-checked:font-bold cursor-pointer">
            Login
          </span>
        </label>
        <label>
          <input
            class="peer hidden"
            type="radio"
            name="authType"
            value="register"
          />
          <span class="peer-checked:text-blue-500 peer-checked:font-bold cursor-pointer">
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
  );
}
