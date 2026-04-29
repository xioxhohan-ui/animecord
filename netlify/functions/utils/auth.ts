import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'animecord-super-secret-key-for-local-dev';

export const generateToken = (user: any) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    return null;
  }
};

export const extractUserFromHeader = (headers: any) => {
  const authHeader = headers.authorization || headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
};
