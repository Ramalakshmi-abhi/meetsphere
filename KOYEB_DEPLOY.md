# Deploy MeetSphere Backend On Koyeb

This project should be deployed as:

- Frontend: Vercel
- Backend API + Socket.IO: Koyeb

The backend service for this repo lives in the [backend](./backend) folder.

## 1. Push Your Code

Push the latest code in this repo to GitHub first.

## 2. Create The Backend Service In Koyeb

In Koyeb:

1. Click `Create App`
2. Choose `GitHub`
3. Select this repository
4. Choose a `Web Service`

Use these settings:

- `Work directory`: `backend`
- `Runtime`: `Node.js`
- `Build command`: leave default or use `npm install`
- `Run command`: `npm start`
- `Port`: `5000`
- `Public HTTP port`: `5000`

Why `backend`:

- This repo is a monorepo.
- The backend code and `package.json` used by the server are inside the [backend](./backend) folder.

## 3. Add Backend Environment Variables In Koyeb

Add these variables to the Koyeb service:

- `MONGODB_URI`
- `JWT_SECRET`
- `EMAIL_USER`
- `EMAIL_PASS`
- `FRONTEND_URL`

Example values:

- `FRONTEND_URL=https://meetsphere-ten.vercel.app`

You can use [backend/.env.example](./backend/.env.example) as the template.

## 4. Deploy

After saving the service settings, deploy the service.

When deployment succeeds, Koyeb gives you a public backend URL like:

- `https://meetsphere-backend-xxxx.koyeb.app`

Keep that URL. You need it in Vercel.

## 5. Configure Vercel Frontend Environment Variables

In your Vercel frontend project, add:

- `VITE_BACKEND_URL=https://your-koyeb-service.koyeb.app`
- `VITE_SOCKET_URL=https://your-koyeb-service.koyeb.app`
- `VITE_PUBLIC_ORIGIN=https://meetsphere-ten.vercel.app`

Redeploy the frontend after adding them.

## 6. Health Check

After Koyeb deploys, open:

- `https://your-koyeb-service.koyeb.app/api/health`

It should return JSON, not a 404 page.

## 7. Final Test

1. Open the Vercel frontend
2. Log in
3. Create a brand new quick meeting
4. Open the new invite link from another device
5. Confirm the room shows `Socket: CONNECTED`

Do not reuse old broken room links created before the backend was fixed.

## Notes

- Free Koyeb services can sleep when idle.
- If email sending fails on Koyeb, first verify `EMAIL_USER` and `EMAIL_PASS`.
- For Gmail, `EMAIL_PASS` should usually be a Gmail App Password, not your normal Gmail password.
