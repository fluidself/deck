import { withIronSessionApiRoute } from 'iron-session/next';
import { NextApiRequest, NextApiResponse } from 'next';
import { ironOptions } from 'constants/iron-session';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;

  if (method === 'GET') {
    const deckInSession = req.session.deck;
    if (deckInSession) {
      return res.status(200).json({ deck: deckInSession });
    } else {
      return res.status(200).json({ deck: null });
    }
  } else if (method === 'POST') {
    const { deckId, pair } = req.body;
    if (!deckId || !pair) {
      return res.json({ ok: false });
    }

    req.session.deck = { id: deckId, pair: typeof pair === 'string' ? JSON.parse(pair) : pair };
    await req.session.save();
    res.json({ ok: true });
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${method} not allowed`);
  }
};

export default withIronSessionApiRoute(handler, ironOptions);
