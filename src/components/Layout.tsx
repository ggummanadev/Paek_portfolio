import { Link, useLocation } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { 
  User, 
  BookOpen, 
  History, 
  PenTool, 
  Share2, 
  LogOut, 
  LogIn,
  Menu,
  X,
  Cpu,
  Layout as LayoutIcon
} from 'lucide-react';
import { useState, ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout({ children }: { children: ReactNode }) {
  const [user] = useAuthState(auth);
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isAdmin = user?.email === 'jabang78@gmail.com';

  const navItems = [
    { name: '강사 소개(Profile)', path: '/', icon: User },
    { name: 'AI 커리큘럼(Curriculum)', path: '/curriculum', icon: BookOpen },
    { name: '강의 이력(Lectures)', path: '/lectures', icon: History },
    { name: '소설 & 칼럼(Articles)', path: '/articles', icon: PenTool },
    { name: '공유 자료(Shared)', path: '/shared', icon: Share2 },
    { name: '작품 소개(Portfolio)', path: '/portfolio', icon: LayoutIcon },
  ];

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans relative">
      {/* Background Image Overlay */}
      <div 
        className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">
                AI/SW 교육전문가
              </span>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                    location.pathname === item.path
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-semibold text-slate-900">{user.displayName}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                      {isAdmin ? 'Administrator' : 'Guest'}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-500 hover:text-red-600 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                  <img 
                    src={user.photoURL || ''} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full border border-slate-200"
                  />
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </button>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 text-slate-600"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={cn(
                  "block px-4 py-3 rounded-lg text-base font-medium flex items-center gap-3",
                  location.pathname === item.path
                    ? "bg-indigo-50 text-indigo-600"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-slate-500 text-sm">
            © 2026 AI/SW Education Expert Portfolio. All rights reserved.
          </p>
          <div className="mt-4 flex justify-center space-x-6">
            <span className="text-xs text-slate-400 uppercase tracking-[0.2em]">Innovation</span>
            <span className="text-xs text-slate-400 uppercase tracking-[0.2em]">Education</span>
            <span className="text-xs text-slate-400 uppercase tracking-[0.2em]">Technology</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
