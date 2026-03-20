import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { usersData, organizationData } from "@/data/seed";

// Demo password hash (demo123)
const DEMO_PASSWORD_HASH = bcrypt.hashSync("demo123", 12);

async function findUserFromDB(email: string) {
  try {
    const { prisma } = await import("@/lib/db");
    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });
    return user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          password: user.password,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organization.name,
        }
      : null;
  } catch {
    return null;
  }
}

function findUserFromDemo(email: string) {
  const demoUser = usersData.find((u) => u.email === email);
  if (!demoUser) return null;
  return {
    id: `demo_${demoUser.email}`,
    name: demoUser.name,
    email: demoUser.email,
    password: DEMO_PASSWORD_HASH,
    role: demoUser.role.toUpperCase(),
    organizationId: "demo_org",
    organizationName: organizationData.name,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        // Try DB first, fallback to demo data
        let user: { id: string; name: string; email: string; password: string; role: string; organizationId: string; organizationName: string } | null = await findUserFromDB(email);
        if (!user) {
          user = findUserFromDemo(email);
        }

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organizationName,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as any).role;
        token.organizationId = (user as any).organizationId;
        token.organizationName = (user as any).organizationName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role as string;
        (session.user as any).organizationId = token.organizationId as string;
        (session.user as any).organizationName = token.organizationName as string;
      }
      return session;
    },
  },
});
