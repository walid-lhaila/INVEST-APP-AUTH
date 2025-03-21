import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import {ConfigService} from "@nestjs/config";

@Injectable()
export class KeycloakStrategy extends PassportStrategy(Strategy, 'keycloak') {
  constructor(private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: ['account', 'investLink', 'realm-management'],
      issuer: config.get('KEYCLOAK_REALME_ISSUER'),
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: config.get<string>('KEYCLOAK_CERT_URI', 'NULL'),
      }),
    });
  }

  async validate(payload: any) {
    const roles = [
      ...(payload.realm_access?.roles || []),
      ...(payload.resource_access?.account?.roles || []),
    ];

    console.log('Payload:', payload);
    console.log('Extracted Roles:', roles);

    return {
      userId: payload.sub,
      username: payload.preferred_username,
      roles,
    };
  }

}
