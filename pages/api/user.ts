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

  // const userInSession = req.session.user;
  // if (userInSession) {
  //   res.status(200).json({ user: userInSession });
  //   return;
  // }

  const address = req.session.siwe?.address;
  if (!address || !process.env.APP_ACCESS_KEY_PAIR) {
    res.status(200).json({ user: null });
    return;
  }

  const { data: dbUser } = await supabase.from<User>('users').select('*').match({ id: address }).single();

  if (dbUser) {
    // DB user exists, return it
    const decryptedKey = await SEA.decrypt(dbUser.gun_key, JSON.parse(process.env.APP_ACCESS_KEY_PAIR));
    const user: User = { ...dbUser, gun_key: decryptedKey };
    console.log('db user exists', user);
    req.session.user = dbUser;
    await req.session.save();

    res.status(200).json({ user });

    return;
  } else {
    // DB user does not exist, create and return
    const key = crypto.randomBytes(32).toString('hex');
    const encryptedKey = await SEA.encrypt(key, JSON.parse(process.env.APP_ACCESS_KEY_PAIR));

    const { data: dbUser, error } = await supabase
      .from<User>('users')
      .insert({
        id: address,
        gun_key: encryptedKey,
      })
      .single();

    if (dbUser) {
      const user: User = { ...dbUser, gun_key: key };
      req.session.user = dbUser;
      await req.session.save();

      res.status(200).json({ user });
    } else if (error) {
      res.status(500).json({ message: error.message });
    }
  }
};

export default withIronSessionApiRoute(handler, ironOptions);
