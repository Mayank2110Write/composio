import { httpApi } from "./http";
import { mockApi } from "./mock";
import type { Api } from "./types";

const base = process.env.NEXT_PUBLIC_API_URL;

export const api: Api = base ? httpApi(base) : mockApi;
export type { Api };
