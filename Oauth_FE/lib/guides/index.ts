import type { GuideDoc } from "../types";
import { github } from "./github";
import { google } from "./google";
import { hubspot } from "./hubspot";
import { microsoft } from "./microsoft";
import { notion } from "./notion";
import { slack } from "./slack";

// Seed library. The backend stores these same documents in its database.
export const LIBRARY: GuideDoc[] = [github, google, hubspot, slack, microsoft, notion];
