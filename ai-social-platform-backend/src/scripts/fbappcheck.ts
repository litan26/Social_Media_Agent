import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

const id = process.env.FACEBOOK_APP_ID;
const secret = process.env.FACEBOOK_APP_SECRET;
const appToken = `${id}|${secret}`;

async function show(label: string, url: string, params: Record<string, string>) {
  try {
    const res = await axios.get(url, { params });
    console.log(`${label}:`, JSON.stringify(res.data).slice(0, 600));
  } catch (e: any) {
    console.log(`${label}: ERR`, JSON.stringify(e.response?.data?.error?.message || e.message));
  }
}

// App token proves the id/secret pair is valid.
await show('app', `https://graph.facebook.com/v21.0/${id}`, {
  fields: 'id,name,category,link',
  access_token: appToken,
});

// Permissions the app currently holds (empty => nothing granted yet).
await show('permissions', `https://graph.facebook.com/v21.0/${id}/permissions`, {
  access_token: appToken,
});
