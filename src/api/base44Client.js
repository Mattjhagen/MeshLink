import { Base44 } from "@base44/sdk";

export const base44 = new Base44({
  appId: import.meta.env.VITE_BASE44_APP_ID,
  appBaseUrl: import.meta.env.VITE_BASE44_APP_BASE_URL,
});
