import type { Request, Response, NextFunction } from 'express';

const API_KEY = process.env.API_KEY || '';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // If no API_KEY environment variable is configured, allow open access
  if (!API_KEY) {
    return next();
  }

  const authHeader = req.headers.authorization;
  const queryKey = req.query.apiKey as string | undefined;

  const providedKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : queryKey;

  if (providedKey === API_KEY) {
    return next();
  }

  res.status(401).json({
    error: 'Unauthorized',
    message: 'Valid API key is required to perform this action.',
  });
}
