import type { GuideDoc } from "../types.js";
import { github } from "./github.js";
import { google } from "./google.js";
import { hubspot } from "./hubspot.js";
import { microsoft } from "./microsoft.js";
import { notion } from "./notion.js";
import { slack } from "./slack.js";

// Seed library. The backend stores these same documents in its database.
export const LIBRARY: GuideDoc[] = [github, google, hubspot, slack, microsoft, notion];
