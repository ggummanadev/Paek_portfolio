import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { ReactNode } from 'react';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const [user, loading] = useAuthState(auth);
  const isAdmin = user?.email === 'jabang78@gmail.com';

  if (loading) return null;
  if (!isAdmin) return null;

  return <>{children}</>;
}
