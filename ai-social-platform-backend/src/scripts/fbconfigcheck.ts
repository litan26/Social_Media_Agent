import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

const id = process.env.FACEBOOK_APP_ID;
const secret = process.env.FACEBOOK_APP_SECRET;
const configId = process.env.FACEBOOK_CONFIG_ID;
const appToken = `${id}|${secret}`;

async function show(label: string, url: string, params: Record<string, string>) {
  try {
    const res = await axios.get(url, { params });
    console.log(`${label}: OK`, JSON.stringify(res.data).slice(0, 800));
  } catch (e: any) {
    const err = e.response?.data?.error;
    console.log(`${label}: ERR`, JSON.stringify(err?.message || e.message));
  }
}

console.log('app id   :', id);
console.log('config id:', configId);
console.log('---');

// Does the login configuration exist and belong to this app?
await show('config', `https://graph.facebook.com/v21.0/${configId}`, {
  access_token: appToken,
});

// List configurations the app actually owns.
await show('app configurations', `https://graph.facebook.com/v21.0/${id}/fb_login_configurations`, {
  access_token: appToken,
});
