# Fix Railway Auto-Deploy
*One-time setup — takes 3 minutes*

The GitHub Actions workflow is ready (`.github/workflows/deploy.yml`).
You just need to add one secret to GitHub.

## Steps

1. **Get a Railway service token:**
   - Go to [railway.app/account/tokens](https://railway.app/account/tokens)
   - Click **"Create Token"**
   - Name it `granwatch-deploy`
   - Copy the token (starts with `railway_...`)

2. **Add it to GitHub:**
   - Go to [github.com/konnaelf-byte/granwatch/settings/secrets/actions](https://github.com/konnaelf-byte/granwatch/settings/secrets/actions)
   - Click **"New repository secret"**
   - Name: `RAILWAY_TOKEN`
   - Value: paste the token from step 1
   - Click **"Add secret"**

3. **Done.** Every future push to `main` will automatically deploy to Railway within ~4 minutes. No more manual `railway up`.

## How to verify it's working
After completing the steps above, make a small change, push to main, then check:
- GitHub → Actions tab → you should see a "Deploy to Railway" workflow running
- Railway dashboard → granwatch service → a new deployment appears automatically
