import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

// Custom extractor that supports both header and query param
const extractJwtFromRequestOrQuery = (req: any) => {
  // First try header (standard approach)
  const authHeader = req.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  }
  
  // Then try query parameter (for SSE)
  const token = req.query?.token;
  if (token) {
    return token;
  }
  
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: extractJwtFromRequestOrQuery,
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fintech-secret-key-change-in-prod',
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
