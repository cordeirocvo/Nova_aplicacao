import { NextResponse, NextRequest } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface AuthenticatedUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  allowedRoutes?: string[];
  [key: string]: any;
}

export interface AuthSessionData {
  session: Session;
  user: AuthenticatedUser;
}

export type AuthenticatedRouteHandler<TContext = any> = (
  req: NextRequest,
  context: TContext,
  auth: AuthSessionData
) => Promise<NextResponse | Response>;

export type SessionResolver = () => Promise<Session | null>;

/**
 * Cria a fábrica de autenticação com suporte a injeção de dependência (IoC)
 * para testes unitários ou custom sessions.
 */
export function createWithAuth(sessionResolver: SessionResolver = () => getServerSession(authOptions)) {
  return function withAuth<TContext = any>(handler: AuthenticatedRouteHandler<TContext>) {
    return async (req: NextRequest, context: TContext) => {
      try {
        let session: Session | null = null;
        try {
          session = await sessionResolver();
        } catch {
          // Se executado sem contexto de headers ou sessão inválida, retorna 401
          return NextResponse.json(
            { error: "Não autorizado. Faça login para continuar." },
            { status: 401 }
          );
        }

        if (!session || !session.user) {
          return NextResponse.json(
            { error: "Não autorizado. Faça login para continuar." },
            { status: 401 }
          );
        }

        const authData: AuthSessionData = {
          session,
          user: session.user as AuthenticatedUser,
        };

        return await handler(req, context, authData);
      } catch (error: any) {
        const path = req.nextUrl?.pathname || req.url || "unknown";
        console.error(`[API_ERROR] ${path}:`, error);
        return NextResponse.json(
          { error: error?.message || "Erro interno no servidor." },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Higher-Order Function padrão para padronizar autenticação, controle de sessão e tratamento
 * de exceções em rotas de API do Next.js (Clean Code / DRY).
 */
export const withAuth = createWithAuth();
