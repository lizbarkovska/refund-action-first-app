# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an extension-only Shopify app called "refund-portal". It does not include a server or admin UI - it only contains app extensions that run in the Shopify customer account environment.

## Development Commands

```bash
# Start development server (connects to Shopify Partners app)
npm run dev

# Build the app
npm run build

# Generate new extensions
npm run generate

# Deploy to Shopify
npm run deploy

# Get app info
npm run info
```

## Architecture

### Workspace Structure
This is a monorepo using npm workspaces. The root `package.json` defines `extensions/*` as workspaces. Each extension lives in its own directory under `extensions/`.

### Extensions
Extensions are configured in `extensions/*/shopify.extension.toml`. Each extension:
- Has its own `package.json` with dependencies
- Uses Preact as the rendering library
- Uses Shopify UI Extensions API (`@shopify/ui-extensions`)
- Targets specific extension points (e.g., `customer-account.order-status.block.render`)

### Current Extension: refund-portal
Located in `extensions/refund-portal/`:
- **Type**: Customer account UI extension
- **Target**: `customer-account.order-status.block.render` (renders on order status page)
- **Framework**: Preact with `@preact/signals`
- **Entry point**: `src/OrderStatusBlock.jsx`
- **API Access**: Enabled (can query Shopify's storefront API)
- **Network Access**: Disabled by default

### Extension Components
Extensions use Shopify's custom element syntax:
- `<s-banner>`, `<s-text>`, etc. are Shopify UI components
- Access to `shopify.i18n.translate()` for internationalization
- Locales stored in `locales/*.json` files

### GraphQL Configuration
`.graphqlrc.js` dynamically discovers extensions with GraphQL schemas. It looks for `schema.graphql` in each extension directory and configures projects accordingly.

## Configuration Files

- **shopify.app.toml**: Main app configuration (client_id, name, scopes, webhooks)
- **extensions/*/shopify.extension.toml**: Extension-specific configuration (api_version, targeting, capabilities)
- **extensions/*/package.json**: Extension dependencies (separate from root)

## API Versions
- App uses webhook API version `2026-04`
- Extensions use API version `2025-10`
