# WOS Manager

A "Whiteout Survival" Alliance Member Management Tool built with React, Tailwind CSS, and Vercel.

## Features

- **Glassmorphism UI**: Modern, aesthetic interface.
- **Player Query**:
    - Single lookup by FID.
    - Batch import with rate-limiting queue (prevents API bans).
- **Group Management**:
    - Create custom tabs (e.g., Attack, Defense).
    - Dynamic columns (Attendance, Contribution).
    - **Drag & Drop** organization.
- **Export**: Copy table data directly to Excel/Google Sheets.
- **Privacy**: All data stored in `localStorage`.

## Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/wos-manager.git
   cd wos-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file in the root:
   ```env
   VITE_API_SALT=tB87#kPtkxqOS2
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

## Deployment on Vercel

This project is optimized for Vercel deployment with a Serverless Function proxy to handle CORS and hide the API signature logic.

### Option A: Vercel Dashboard (Recommended)

1. Push your code to GitHub.
2. Go to [Vercel](https://vercel.com) and "Add New Project".
3. Import your repository.
4. **Environment Variables**: Add `VITE_API_SALT` with your salt value.
5. Click **Deploy**.

### Option B: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel --prod
```

## Security Note

This app uses a Vercel Serverless Function (`api/player.ts`) to proxy requests to the game API. This ensures:
1. The API Salt is not exposed in the client-side JavaScript bundle.
2. CORS issues are resolved by the proxy.

However, since the Vercel function is public, technically anyone could use your proxy endpoint to query the game API.

## Troubleshooting

- **429 Too Many Requests**: The batch importer has a built-in delay (250ms). If you still hit limits, increase the sleep time in `components/ImportPanel.tsx`.
- **CORS Errors locally**: Ensure you are running `vercel dev` if you want to test the API function locally, or use the direct fetch fallback (which might fail due to browser security).
