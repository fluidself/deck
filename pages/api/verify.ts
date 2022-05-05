import { withIronSessionApiRoute } from 'iron-session/next';
import { NextApiRequest, NextApiResponse } from 'next';
import { SiweMessage } from 'siwe';
import { ironOptions } from 'constants/iron-session';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${method} not allowed`);
  }

  try {
    const { message, signature } = req.body;
    const siweMessage = new SiweMessage(message);
    const fields = await siweMessage.validate(signature);

    if (fields.nonce !== req.session.nonce) {
      return res.status(422).json({ message: 'Invalid nonce.' });
    }

    req.session.siwe = fields;
    await req.session.save();
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false });
  }
};

export default withIronSessionApiRoute(handler, ironOptions);
