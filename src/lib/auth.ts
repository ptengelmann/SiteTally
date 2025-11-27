import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import pool from './db';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const result = await pool.query(
            `SELECT user_id, email, password_hash, first_name, last_name, is_active, role
             FROM users WHERE email = $1`,
            [credentials.email]
          );

          if (result.rows.length === 0) {
            return null;
          }

          const user = result.rows[0];

          if (!user.is_active) {
            return null;
          }

          if (!user.password_hash) {
            return null;
          }

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password_hash
          );

          if (!isValid) {
            return null;
          }

          return {
            id: user.user_id,
            email: user.email,
            name: `${user.first_name} ${user.last_name}`,
            role: user.role,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});
