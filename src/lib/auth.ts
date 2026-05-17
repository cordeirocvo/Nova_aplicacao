import bcrypt from "bcryptjs";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Cordeiro Energia",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@cordeiroenergia.com.br" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials) {
        console.log("Authorize attempt for:", credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing credentials");
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          if (!user) {
            console.log("User not found:", credentials.email);
            return null;
          }

          const passwordMatch = await bcrypt.compare(credentials.password, user.password);
          const plainMatch = user.password === credentials.password;

          if (passwordMatch || plainMatch) {
            console.log("Login successful for:", credentials.email);
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              canAccessBudgets: user.canAccessBudgets,
              canEditBudgets: user.canEditBudgets,
              canAccessAppLeads: user.canAccessAppLeads,
              canManageCRM: user.canManageCRM,
            };
          }
          
          console.log("Invalid password for:", credentials.email);
          return null;
        } catch (error) {
          console.error("Error in authorize:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: { token: any, user: any }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
        token.canAccessBudgets = (user as any).canAccessBudgets;
        token.canEditBudgets = (user as any).canEditBudgets;
        token.canAccessAppLeads = (user as any).canAccessAppLeads;
        token.canManageCRM = (user as any).canManageCRM;
        token.canAccessSIE = (user as any).canAccessSIE;
      }
      return token;
    },
    async session({ session, token }: { session: any, token: any }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).canAccessBudgets = token.canAccessBudgets;
        (session.user as any).canEditBudgets = token.canEditBudgets;
        (session.user as any).canAccessAppLeads = token.canAccessAppLeads;
        (session.user as any).canManageCRM = token.canManageCRM;
        (session.user as any).canAccessSIE = token.canAccessSIE;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
  useSecureCookies: process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_URL?.includes('localhost'),
};
