# Agent vs hand-checked guides

Generated 2026-10-29 by `npm run eval`. The agent ran the same live pipeline the app uses, without seeing the library guide.

"Hardest level by audience" compares, for each answer to "Who will connect?", the hardest level across the things the agent could do.

| App | Checked guide | Agent | Hardest level by audience | Facts confirmed on page | Provider-doc sources | Time |
| --- | --- | --- | --- | --- | --- | --- |
| Notion | Self-serve | Self-serve | ✓ team: Self-serve<br>✓ few: Self-serve<br>✓ public: Self-serve | 10/10 | 6/7 | 40s |
| Slack | Self-serve → Gated | Self-serve | ✓ team: Self-serve<br>✓ few: Self-serve<br>✗ public: Self-serve | 9/12 | 4/5 | 30s |
| GitHub | Self-serve | Self-serve → Gated | ✓ team: Self-serve<br>✓ few: Self-serve<br>✗ public: Gated | 11/11 | 4/5 | 23s |
| HubSpot | Self-serve → Gated | Self-serve | ✓ team: Self-serve<br>✓ few: Self-serve<br>✗ public: Self-serve | 10/10 | 3/4 | 32s |

### Notion

Agent's main blocker (public): Incorrect redirect URI configuration during token exchange.

Agent's uses: Read page content (read_content); Update page content (read_content, update_content); Manage databases (read_content, update_content, insert_content)

Facts the agent confirmed:
- Public connections must be created in the Developer portal, where you specify redirect URIs and the installation scope. ([source](https://developers.notion.com/guides/get-started/authorization))
- Public connections can be configured for 'Any workspace' or 'Selected workspaces only' at creation, and this cannot be changed later. ([source](https://developers.notion.com/guides/get-started/authorization))
- Public connections must undergo a security review by the Notion team before they can be listed on the Marketplace. ([source](https://developers.notion.com/guides/get-started/overview))
- Only public connections with an installation scope of 'Any workspace' are eligible for listing on the Notion Marketplace. ([source](https://developers.notion.com/guides/get-started/marketplace-listing))
- Marketplace listing submissions typically receive a response from the Notion team within 5-10 business days. ([source](https://developers.notion.com/guides/get-started/marketplace-listing))
- Internal connections require the creator to be a workspace owner. ([source](https://developers.notion.com/guides/get-started/authorization))
- Personal access tokens (PATs) have a configurable expiration of up to one year, after which they must be replaced. ([source](https://developers.notion.com/guides/get-started/personal-access-tokens))
- The Notion API token endpoint for OAuth code exchange requires a client secret and must be performed on a server, not in a browser. ([source](https://developers.notion.com/guides/get-started/handling-api-keys))

### Slack

Agent's main blocker (public): Ensure your redirect URL uses HTTPS.

Agent's uses: Read public channel messages (channels:history); Send messages as the app (chat:write); Perform actions on behalf of a user (channels:write, files:write)

Facts the agent confirmed:
- You must register your Slack app and manage its configuration, including client ID and secret, through the App Management page. ([source](https://docs.slack.dev/authentication/installing-with-oauth/))
- Redirect URIs used in the OAuth flow must use HTTPS. ([source](https://docs.slack.dev/authentication/installing-with-oauth/))
- Your redirect_uri must match or be a subdirectory of a Redirect URL configured under App Management. ([source](https://docs.slack.dev/authentication/installing-with-oauth/))
- Bot tokens begin with 'xoxb-' and are tied to the app rather than a user's identity. ([source](https://docs.slack.dev/authentication/tokens/))
- User tokens begin with 'xoxp-' and represent a workspace member, allowing the app to act on their behalf. ([source](https://docs.slack.dev/authentication/tokens/))
- App-level tokens begin with 'xapp-' and are used for app-wide functionality across organizations. ([source](https://docs.slack.dev/authentication/tokens/))
- Workflow tokens expire 15 minutes after issuance or upon completion of a function step, whichever comes first. ([source](https://docs.slack.dev/authentication/tokens/))
- Scopes are requested during the OAuth flow and determine the actions an app can perform. ([source](https://docs.slack.dev/reference/scopes/))

### GitHub

Agent's main blocker (public): None

Agent's uses: Read public repository data (repo:status); Manage repository issues (repo)

Facts the agent confirmed:
- You can create and register an OAuth app under your personal account or any organization where you have administrative access. ([source](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app))
- A user or organization can own a maximum of 100 OAuth apps. ([source](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app))
- There is a limit of ten tokens issued per user/application/scope combination, and a rate limit of ten tokens created per hour. ([source](https://docs.github.com/en/apps/oauth-apps/using-oauth-apps/authorizing-oauth-apps))
- OAuth apps have a primary rate limit of 5,000 requests per hour, which increases to 15,000 if the app is owned by a GitHub Enterprise Cloud organization. ([source](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api))
- GitHub enforces a secondary rate limit of no more than 2,000 OAuth access token requests per hour for OAuth apps. ([source](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api))
- Access tokens can be configured to expire after eight hours, with a refresh token that expires after six months without use. ([source](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps))
- Users must verify their primary email address with GitHub before they can authorize an OAuth app. ([source](https://docs.github.com/en/apps/oauth-apps/maintaining-oauth-apps/troubleshooting-oauth-app-access-token-request-errors))
- You can register up to 10 callback URLs for an OAuth app. ([source](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app))

### HubSpot

Agent's main blocker (public): Redirect URI must use HTTPS and a domain name.

Agent's uses: Read contact lists (crm.objects.contacts.read); Create and update deals (crm.objects.deals.read, crm.objects.deals.write)

Facts the agent confirmed:
- To set up OAuth for a HubSpot app, you must first create a developer account and an app associated with that account. ([source](https://developers.hubspot.com/docs/apps/legacy-apps/authentication/oauth-quickstart-guide))
- Any app designed for installation by multiple HubSpot accounts or listing on the HubSpot Marketplace must use OAuth. ([source](https://developers.hubspot.com/docs/apps/legacy-apps/authentication/working-with-oauth))
- Users installing apps in their HubSpot account must be a Super Admin or have HubSpot Marketplace Access permissions. ([source](https://developers.hubspot.com/docs/apps/legacy-apps/authentication/working-with-oauth))
- For production applications, the redirect URI must use HTTPS. ([source](https://developers.hubspot.com/docs/apps/legacy-apps/authentication/oauth-quickstart-guide))
- HubSpot access tokens expire after 30 minutes. ([source](https://developers.hubspot.com/docs/apps/legacy-apps/authentication/oauth-quickstart-guide))
- When configuring redirect URIs, you must use a domain, as IP addresses are not supported. ([source](https://developers.hubspot.com/docs/apps/legacy-apps/authentication/working-with-oauth))
- Access tokens reflect the scopes requested from the app and do not reflect the specific permissions or limitations of the user in their HubSpot account. ([source](https://developers.hubspot.com/docs/apps/legacy-apps/authentication/oauth-quickstart-guide))
- If a user installing an app does not have access to all requested scopes, the installation will fail and they will be directed to an error page. ([source](https://developers.hubspot.com/docs/apps/legacy-apps/authentication/oauth-quickstart-guide))
