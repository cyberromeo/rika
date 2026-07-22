import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@medx-e9acd.iam.gserviceaccount.com';
const rawKey = process.env.FIREBASE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCpjlgjlFfpY++/\nibhrLv+CQVZUN41Drp7mQPSY/nRL3rJOW0gZswy3MkItHNymGbrYHKSzXnqS7mA5\nW0D/hjIel4hHIq0zGvmpkDIxrpFbG+FDgAcJc/G0ES0BlfFvBzRUIRNXZOV5VXwv\n2VJsxRPVnPZGzu1rkHXZHxLqTDPQgIbjGMy8+pcsk5/85uvTex4bdR3Is68qWlgA\nwrH8PmzMLGoZeFH1p9XEAHBTlHgTPL0OTKsiMewmk/ui6BWmAneehgDVzIMT9dd1\nmrRrzpAdTxkQMeCg/1VOUTc10+HB8q9f9qEtwvqyAA8+WIVb+aB6B7+rMwJQCrb+\n4PjjlPDDAgMBAAECggEAAhzIY1UXTUyV8ZR1LDyvKT/IJA93Hpc/2o2HnppY95ME\nNK61dMCC0Yt6QJah9x3N8qBUuvlb3JXEtCI7apOQ70mjBIPdlYvp/V9TCMRsgi6U\nPWOMcuUzZzNplKH6GpCD6eJpm8ahh0P14qC6Aqnn59rnRJWSZqsrlLNq6GlfoeLa\n2l1sQdlzZfdrHmtNl0S1VxyvH9ONSt/I59wnBHo6xH/QyKb7DO3QS8FlA8EaY34X\nQCLazAboGsBDNuTwnfJ5Q8NI1ypUFxt7ZKVBydBat5jEP+6aEBOoi3OW52B2EMyb\nkW7aLXaTrYU5NNtB8TylE483ii3vkDhsvtKXNsCgHQKBgQDQxfodzXFevasm3PZz\nmA6N9Ga082Rlv/rurFMtqrXs1W7ZwAuNXB0pOh28n3KvI0fAxOSrjIHRs8wmPnWK\nhaMwSThwdA3mquAlmZgRsbUJs4yrIxmq6aaDuESMTbO9y7FVl5BY6UCXwlk4d/E6\nlIV40GoggQm5PweBfZJ2I9m+dwKBgQDP6UzkJqcV0FFSxJGfZsEu21SRHnbpVzkS\nl6uY0G/Ph5EcMf5XNHhDA1Hr76qY786AXrGK/MbLEzHRlK7lJVw70Km13WFpUx1g\nTP30EQ97dGy55U2DGlqpa13rCO6eyQ1YhBMBJ0VcKigZsHeoryCoJa7VwIIYk5pX\nwmqPfwl3FQKBgQC4F2rmbqriTMMnwL38zf8/g1wxgVFtO20Mmp257gb/cHCPx/0n\nyCramKlyEvNwpd52h+fPsVUj0bRZoMfKvu5X/Kis2FkNpm2CGj7yk0284TtQCOJw\nSBmRmqGvSjENUhjsDXq2O+++IhzEY1cuPZq4HqcGRGKLm52FvHGyhQhTHwKBgCDw\ndmUjFo+nLGsvh164udyBlTlUmURItFsUunQAeeZoNP5BkWkhf/gl+4Gku+N1AsNl\nvT0m5RvhU6A/rSHStHUpjumoRDmamGncaNOVLF3DyUH+aTRfJYP35a5KAPwZIEso\nyZYCMcPzTd0cDykjbcoWBkgJMtNP90D2JUnMt6QtAoGBAIFcyXNahOxf4EelnIPF\nZg9ugdCJrhgblpWnMvtAP8gdSSYXoOoOKxMI9pMj3YFH89OO14m3/JvDeesDVtMg\nPli8AerqjVq1JLQvrJKF9ivx9uGsfPQu3R3nbdeJdW5t0WF3Bf83VNxFObaxl8uo\ne/yEBDGjK9H6REQYkqwF2YqX\n-----END PRIVATE KEY-----\n';
const privateKey = rawKey.replace(/\\n/g, '\n');
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'medx-e9acd';

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const adminDb = getFirestore();
const TRACKER_COL = 'user_tracker';
const DEFAULT_USER_ID = 'NpFFvozZSFWnCKdmutkISEGPf8o2';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const userId = req.query.userId || DEFAULT_USER_ID;
      const docRef = adminDb.collection(TRACKER_COL).doc(String(userId));
      const docSnap = await docRef.get();

      if (docSnap.exists) {
        return res.status(200).json(docSnap.data());
      } else {
        return res.status(200).json({ subjects: {}, gts: {} });
      }
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const userId = body.userId || DEFAULT_USER_ID;
      const docRef = adminDb.collection(TRACKER_COL).doc(String(userId));

      if (body.subject && body.field !== undefined) {
        const { subject, field, value } = body;
        await docRef.set(
          {
            subjects: {
              [subject]: {
                [field]: Boolean(value),
              },
            },
          },
          { merge: true }
        );
        return res.status(200).json({ success: true });
      } else if (body.gt !== undefined) {
        const { gt, value } = body;
        await docRef.set(
          {
            gts: {
              [gt]: Boolean(value),
            },
          },
          { merge: true }
        );
        return res.status(200).json({ success: true });
      } else if (body.subjects || body.gts) {
        await docRef.set(
          {
            ...(body.subjects ? { subjects: body.subjects } : {}),
            ...(body.gts ? { gts: body.gts } : {}),
          },
          { merge: true }
        );
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ error: 'Invalid payload' });
    }

    res.setHeader('Allow', 'GET, POST, OPTIONS');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Tracker API Error:', error);
    return res.status(500).json({
      error: 'Failed to process tracker request',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
