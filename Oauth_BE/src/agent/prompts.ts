// Prompts and output schemas for the three model calls. The model gathers and
// phrases facts; code checks them and decides what they mean.

const str = { type: "string" };
const strArr = { type: "array", items: str };

export const DISCOVER_SYSTEM = `You help developers set up OAuth apps with third-party providers so their users can connect accounts to an AI agent.
Given an app name or website, identify the provider and list the official web pages most likely to document: creating/registering an OAuth app, scopes or permissions, app review / verification / marketplace listing, install or user caps, rate limits, token lifetimes, and admin consent.
Only list URLs you believe exist. Prefer the provider's own developer documentation. Code will open every URL and drop any that don't load, so don't pad the list.`;

export const DISCOVER_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string", description: "Product name as the provider writes it" },
    domain: { type: "string", description: "Provider's main domain, e.g. zoom.us" },
    category: { type: "string", description: "Two or three words, e.g. 'Video meetings'" },
    supportsOAuth: { type: "boolean", description: "False if the provider offers no OAuth for third-party apps" },
    developerConsoleUrl: { type: "string", description: "Where developers create apps, or empty" },
    candidateUrls: {
      type: "array",
      items: { type: "object", properties: { url: str, why: str }, required: ["url", "why"] },
    },
  },
  required: ["name", "domain", "category", "supportsOAuth", "developerConsoleUrl", "candidateUrls"],
};

export const EXTRACT_SYSTEM = `You extract facts about setting up an OAuth app from documentation pages that are given to you.
Rules:
- Use ONLY the page texts provided. Do not use outside knowledge.
- Every fact must include "quote": an exact, contiguous excerpt (10-40 words) copied character for character from the page it came from, and "url": that page's URL exactly as given.
- If pages don't cover something, don't invent it. Missing facts are fine.
- Return at most 30 facts, most important first.
- Prefer facts that change how hard setup is: review or verification requirements and which scopes or audiences trigger them, paid security assessments, install or user caps, listing requirements, token expiry, admin consent, rate limits, redirect URI rules, where to register the app.`;

export const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    facts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: {
            type: "string",
            enum: ["registration", "scopes", "review", "audit", "cap", "distribution", "tokens", "admin_consent", "limits", "pricing", "requirements", "other"],
          },
          statement: { type: "string", description: "The fact in one plain sentence" },
          quote: str,
          url: str,
        },
        required: ["topic", "statement", "quote", "url"],
      },
    },
  },
  required: ["facts"],
};

export const WRITE_SYSTEM = `You write a practical, plain-language setup guide for a developer who needs their own OAuth app with a provider, so their users can connect accounts to the developer's AI agent (often through Composio).
You are given a numbered list of verified facts (F1, F2, ...). Rules:
- Base every claim on the facts. Cite the fact ids that support each item in "factIds". If an item has no supporting fact, leave factIds empty and keep it cautious.
- Be concrete: exact console names, field names and values. Short sentences. No marketing.
- For any redirect/callback URL value, write exactly {{callback}}.
- "does" options are 2-4 things an AI agent commonly does with this app, from least to most access, with the narrowest scopes for each. Set "review" per option to: "none" (no provider review), "review" (the provider reviews, verifies or approves the app before broad use, including the provider's own security review), or "audit" (ONLY when a paid, independent third-party security assessment is required, like Google's CASA). Only use review/audit when a fact supports it. A review that only applies to an OPTIONAL marketplace, directory or gallery listing (one that isn't needed for other customers to connect via OAuth) is NOT review: set "none" and describe the listing as a choice instead. Only use review when the facts say users outside your organization can't connect, or are capped or warned, until the provider approves the app.
- "cap": only a numeric growth limit that applies before approval, written short with its number, e.g. "25 installs" or "100 users". Leave text empty if no fact states a number. "Needs approval to go public" is a review, not a cap. Token, request and rate limits are never caps.
- Timing: workText is the developer's hands-on time as a range ("30-60 min", "4-8 hours", "2-5 days") and workHours is that time in hours. waitText is calendar time waiting on the provider as a range ("Up to 10 days", "2-6 weeks"), "None", or "Unknown"; waitDays is that in days (0 if none, your best estimate if unknown). Never write descriptions like "Preparation" instead of a duration.
- Steps: 7-12 in total. Always cover: creating the app in the provider's console, the app type to choose, adding the redirect URL ({{callback}}), choosing scopes, copying the client ID and secret into a Composio auth config, connecting a test account, and (when review applies) each submission step and the wait. Add an "agent" step with a drafted text (scope justification, review notes or an admin request) when review or admin consent applies.
- "reviewAudience": "public" if review only applies when anyone can connect, or "few_and_public" if it also applies when a handful of external customers connect.
- "appliesTo" controls when an item is shown: always | public (anyone can connect) | outside (a few customers or anyone) | team (internal only) | review (provider review needed) | audit | no_review.
- Steps: who is "agent" (something this guide prepares, like a drafted justification), "you" (the developer), "provider" (waiting on the provider) or "customer" (the customer's admin). Include 6-12 steps across phases such as Register, Configure, Test, Get approved, Roll out.
- Times are ranges in plain words ("5 min", "1-2 days"). Waiting times must be honest; if the facts don't state a duration, say "Unknown" and add an unknown.
- "unknowns" lists what the facts don't settle and a developer should check.
- Limits: 2-4 "does" options, up to 4 choices, 6 prerequisites, 6 blockers, 4 customerSide items, 2-6 phases.`;

const appliesTo = { type: "string", enum: ["always", "public", "outside", "team", "review", "audit", "no_review"] };
const factIds = { type: "array", items: str };
const timing = {
  type: "object",
  properties: { workText: str, workHours: { type: "number" }, waitText: str, waitDays: { type: "number" } },
  required: ["workText", "workHours", "waitText", "waitDays"],
};
const cited = { type: "object", properties: { text: str, factIds }, required: ["text", "factIds"] };

export const WRITE_SCHEMA = {
  type: "object",
  properties: {
    tagline: { type: "string", description: "One sentence: how hard this is and why" },
    does: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: "Starts with a verb, e.g. 'Read meeting recordings'" },
          scopes: strArr,
          note: str,
          reviewTrigger: {
            type: "string",
            enum: ["none", "optional_listing", "external_users"],
            description:
              "What any review is for. external_users: customers outside your org can't connect (or are capped or warned) until the provider approves. optional_listing: review only to appear in a marketplace or gallery; OAuth works without it. none: no review.",
          },
          review: { type: "string", enum: ["none", "review", "audit"] },
          factIds,
        },
        required: ["label", "scopes", "note", "reviewTrigger", "review", "factIds"],
      },
    },
    reviewAudience: { type: "string", enum: ["public", "few_and_public"] },
    cap: {
      type: "object",
      description: "A growth limit for apps anyone can install, before the provider approves a listing. text empty if none.",
      properties: { text: str, factIds },
      required: ["text", "factIds"],
    },
    timing: {
      type: "object",
      properties: { noReview: timing, review: timing, audit: timing, bufferText: str, bufferDays: { type: "number" } },
      required: ["noReview", "review", "audit", "bufferText", "bufferDays"],
    },
    cost: {
      type: "object",
      properties: { noReview: str, review: str, audit: str },
      required: ["noReview", "review", "audit"],
    },
    mainBlocker: {
      type: "object",
      properties: { noReview: cited, review: cited, audit: cited, capped: cited },
      required: ["noReview", "review", "audit", "capped"],
    },
    choices: {
      type: "array",
      items: {
        type: "object",
        properties: { title: str, choice: str, consequence: str, factIds, appliesTo },
        required: ["title", "choice", "consequence", "factIds", "appliesTo"],
      },
    },
    prerequisites: {
      type: "array",
      items: { type: "object", properties: { text: str, factIds, appliesTo }, required: ["text", "factIds", "appliesTo"] },
    },
    phases: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: str,
          appliesTo,
          steps: {
            type: "array",
            items: {
              type: "object",
              properties: {
                who: { type: "string", enum: ["agent", "you", "provider", "customer"] },
                title: str,
                time: str,
                detail: str,
                fields: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: { label: str, value: str, example: { type: "boolean", description: "True when the developer replaces it with their own value" } },
                    required: ["label", "value", "example"],
                  },
                },
                draft: { type: "string", description: "Text prepared for the developer to paste, or empty" },
                check: { type: "string", description: "A common mistake at this step, or empty" },
                linkLabel: str,
                linkUrl: { type: "string", description: "Console or docs page for this step, or empty" },
                factIds,
                appliesTo,
              },
              required: ["who", "title", "time", "detail", "fields", "draft", "check", "linkLabel", "linkUrl", "factIds", "appliesTo"],
            },
          },
        },
        required: ["name", "appliesTo", "steps"],
      },
    },
    approval: {
      type: "object",
      description: "What the provider reviews and what to do while waiting. Shown only when review applies.",
      properties: { summary: str, whileWaiting: strArr, factIds },
      required: ["summary", "whileWaiting", "factIds"],
    },
    blockers: {
      type: "array",
      items: {
        type: "object",
        properties: { symptom: str, cause: str, fix: str, factIds, appliesTo },
        required: ["symptom", "cause", "fix", "factIds", "appliesTo"],
      },
    },
    customerSide: {
      type: "array",
      items: { type: "object", properties: { text: str, factIds }, required: ["text", "factIds"] },
    },
    unknowns: strArr,
  },
  required: ["tagline", "does", "reviewAudience", "cap", "timing", "cost", "mainBlocker", "choices", "prerequisites", "phases", "approval", "blockers", "customerSide", "unknowns"],
};

export type Discovery = {
  name: string;
  domain: string;
  category: string;
  supportsOAuth: boolean;
  developerConsoleUrl: string;
  candidateUrls: { url: string; why: string }[];
};

export type ExtractedFact = { topic: string; statement: string; quote: string; url: string };

type Applies = "always" | "public" | "outside" | "team" | "review" | "audit" | "no_review";
type CitedOut = { text: string; factIds: string[] };
type TimingOut = { workText: string; workHours: number; waitText: string; waitDays: number };

export type Written = {
  tagline: string;
  does: {
    label: string;
    scopes: string[];
    note: string;
    reviewTrigger: "none" | "optional_listing" | "external_users";
    review: "none" | "review" | "audit";
    factIds: string[];
  }[];
  reviewAudience: "public" | "few_and_public";
  cap: CitedOut;
  timing: { noReview: TimingOut; review: TimingOut; audit: TimingOut; bufferText: string; bufferDays: number };
  cost: { noReview: string; review: string; audit: string };
  mainBlocker: { noReview: CitedOut; review: CitedOut; audit: CitedOut; capped: CitedOut };
  choices: { title: string; choice: string; consequence: string; factIds: string[]; appliesTo: Applies }[];
  prerequisites: { text: string; factIds: string[]; appliesTo: Applies }[];
  phases: {
    name: string;
    appliesTo: Applies;
    steps: {
      who: "agent" | "you" | "provider" | "customer";
      title: string;
      time: string;
      detail: string;
      fields: { label: string; value: string; example: boolean }[];
      draft: string;
      check: string;
      linkLabel: string;
      linkUrl: string;
      factIds: string[];
      appliesTo: Applies;
    }[];
  }[];
  approval: { summary: string; whileWaiting: string[]; factIds: string[] };
  blockers: { symptom: string; cause: string; fix: string; factIds: string[]; appliesTo: Applies }[];
  customerSide: CitedOut[];
  unknowns: string[];
};
