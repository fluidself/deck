import { withIronSessionApiRoute } from 'iron-session/next';
import { NextApiRequest, NextApiResponse } from 'next';
import { ironOptions } from 'constants/iron-session';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;

  if (method === 'GET') {
    const gunInSession = req.session.gun;
    if (gunInSession) {
      return res.status(200).json({ gun: gunInSession });
    } else {
      return res.status(200).json({ gun: null });
    }
  } else if (method === 'POST') {
    const { sea } = req.body;
    if (!sea) {
      return res.json({ ok: false });
    }

    req.session.gun = sea;
    await req.session.save();
    res.json({ ok: true });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${method} not allowed`);
  }
};

export default withIronSessionApiRoute(handler, ironOptions);
