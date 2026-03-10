**Welcome to your Base44 project** 

**About**

View and Edit  your app on [Base44.com](http://Base44.com) 

This project contains everything you need to run your app locally.

**Edit the code in your local development environment**

Any change pushed to the repo will also be reflected in the Base44 Builder.

**Prerequisites:** 

1. Clone the repository using the project's Git URL 
2. Navigate to the project directory
3. Install dependencies: `npm install`
4. Create an `.env.local` file and set the right environment variables

```
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url

e.g.
VITE_BASE44_APP_ID=cbef744a8545c389ef439ea6
VITE_BASE44_APP_BASE_URL=https://my-to-do-list-81bfaad7.base44.app
```

Run the app: `npm run dev`

**Publish your changes**

Open [Base44.com](http://Base44.com) and click on Publish.

**Deploy via Netlify**

To deploy this MVP web app to Netlify:

1. Connect your GitHub repository to Netlify.
2. In the Netlify site settings, configure the following build settings:
   - **Base directory:** `src/`
   - **Build command:** `npm run build`
   - **Publish directory:** `src/dist/` (or `dist` if Netlify automatically resolves it relative to the Base directory)
3. Add your environment variables (`VITE_BASE44_APP_ID`, `VITE_BASE44_APP_BASE_URL`) under Netlify's **Site configuration > Environment variables**.
4. Deploy the site.
**Docs & Support**

Documentation: [https://docs.base44.com/Integrations/Using-GitHub](https://docs.base44.com/Integrations/Using-GitHub)

Support: [https://app.base44.com/support](https://app.base44.com/support)
