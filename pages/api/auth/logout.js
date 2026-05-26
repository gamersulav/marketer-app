import { clearCookie } from '../../../lib/auth';

export default function handler(req, res) {
  clearCookie(res);
  res.json({ ok: true });
}
