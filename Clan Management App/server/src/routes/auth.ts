import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

export const authRouter = Router();
const prisma = new PrismaClient();

authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' });
      return;
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    if (username !== adminUsername) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Compare password (support both hashed and plain text for dev)
    let passwordMatch = false;
    if (adminPassword.startsWith('$2')) {
      passwordMatch = await bcrypt.compare(password, adminPassword);
    } else {
      passwordMatch = password === adminPassword;
    }

    if (!passwordMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { username: adminUsername },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });
    
    // Log login
    await prisma.auditLog.create({
      data: {
        adminUser: username,
        action: 'LOGIN',
        details: 'Admin logged in',
      }
    });

    res.json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

authRouter.get('/me', async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { username: string };
    res.json({ username: decoded.username });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});
