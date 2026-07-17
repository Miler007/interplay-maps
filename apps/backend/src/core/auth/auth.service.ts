import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  private refreshTokens: Map<string, { userId: string; expiresAt: Date }> = new Map();

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string, name: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name },
    });
    return this.generateTokens(user);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inactivo');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.generateTokens(user);
  }

  async refresh(refreshToken: string) {
    const stored = this.refreshTokens.get(refreshToken);
    if (!stored || stored.expiresAt < new Date()) {
      this.refreshTokens.delete(refreshToken);
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }
    this.refreshTokens.delete(refreshToken);
    return this.generateTokens(user);
  }

  async logout(refreshToken: string) {
    this.refreshTokens.delete(refreshToken);
  }

  private generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.generateRefreshToken(user.id);
    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  private generateRefreshToken(userId: string): string {
    const token = `interplay-refresh-${userId}-${Date.now()}-${Math.random().toString(36).substr(2)}`;
    this.refreshTokens.set(token, {
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return token;
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });
  }
}
