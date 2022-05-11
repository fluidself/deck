import { withIronSessionApiRoute } from 'iron-session/next';
import { NextApiRequest, NextApiResponse } from 'next';
import { ironOptions } from 'constants/iron-session';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${method} not allowed`);
  }

  const { deckId, pair } = req.body;
  if (!deckId || !pair) {
    return res.json({ ok: false });
  }

  req.session.deck = { id: deckId, pair };
  await req.session.save();
  res.json({ ok: true });
};

export default withIronSessionApiRoute(handler, ironOptions);
