# mix-vault

mix-vault is a self-hosted streaming platform for DJs and producers to upload their tracks and host mixes without relying on third-party services. It also provides an API so mixes can be pulled into a site as needed.

## Tech Stack

- Next.js
- Cloudflare runtime
- OpenNext.js Cloudflare integration
- Tailwind CSS + daisyUI
- TypeScript
- pnpm

## Getting Started

Use the project scripts below to run and manage the app.

```bash
pnpm run dev # start development server (runs cf-typegen then next dev)
pnpm run build # build the app (runs cf-typegen then next build)
pnpm run start # start the production server
pnpm run lint # run Next.js lint
pnpm run deploy # build and deploy to Cloudflare
pnpm run upload # build and upload to Cloudflare
pnpm run preview # build and preview on Cloudflare runtime
pnpm run cf-typegen # generate Cloudflare environment types
```
