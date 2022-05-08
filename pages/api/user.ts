import { withIronSessionApiRoute } from 'iron-session/next';
import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import SEA from 'gun/sea';
import { ironOptions } from 'constants/iron-session';
import { User } from 'types/supabase';
import supabase from 'lib/supabase';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${method} not allowed`);
  }

  const userInSession = req.session.user;
  if (userInSession) {
    res.status(200).json({ user: userInSession });
    return;
  }

  const address = req.session.siwe?.address;
  if (!address || !process.env.APP_ACCESS_KEY_PAIR) {
    res.status(200).json({ user: null });
    return;
  }

  const user = { id: address };
  req.session.user = user;
  await req.session.save();

  res.status(200).json({ user });

  return;
};

export default withIronSessionApiRoute(handler, ironOptions);
