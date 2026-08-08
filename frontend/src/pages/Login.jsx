import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, BookOpen, GraduationCap, Crown, Wrench, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';


const DEMO_ACCOUNTS = {
  student:   { email: 'test@studyease.com',  password: 'Test@1234'  },
  cr:        { email: 'cr@studyease.com',    password: 'Cr@12345'   },
  moderator: { email: 'mod@studyease.com',   password: 'Mod@12345'  },
  admin:     { email: 'admin@studyease.com', password: 'Admin@1234' },
};

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(null);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError(authError.message || 'Invalid email or password');
        return;
      }

      // Store the token for backend requests
      const token = data.session.access_token;
      localStorage.setItem('supabase.auth.token', token);

      // Check if user needs to join a batch (bootstrap will tell us)
      const res = await api.get('/api/auth/bootstrap');

      if (res.data.ok) {
        const role = res.data.user?.role;
        const isPrivileged = ['admin', 'university_moderator'].includes(role);
        if (isPrivileged || res.data.academic) {
          navigate('/dashboard');
        } else {
          navigate('/limbo'); // student/CR with no batch → pick one
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: Create user via our backend (which uses the Admin API)
      const res = await api.post('/api/auth/register', { email, password, name });

      if (!res.data.ok) {
        setError(res.data.error || 'Registration failed');
        return;
      }

      // Step 2: Automatically sign in after registration
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError('Account created! Please sign in.');
        setIsLogin(true);
        return;
      }

      localStorage.setItem('supabase.auth.token', data.session.access_token);
      navigate('/limbo'); // New users always go to limbo to pick a batch
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        setError('Email is already registered. Please sign in.');
      } else {
        setError(err.response?.data?.error || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (role) => {
    setError('');
    setDemoLoading(role);
    const { email: demoEmail, password: demoPassword } = DEMO_ACCOUNTS[role];
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword
      });
      if (authError) {
        setError(`Demo login failed: ${authError.message}`);
        return;
      }
      const token = data.session.access_token;
      localStorage.setItem('supabase.auth.token', token);

      const res = await api.get('/api/auth/bootstrap');

      if (res.data.ok) {
        const role = res.data.user?.role;
        const isPrivileged = ['admin', 'university_moderator'].includes(role);
        if (isPrivileged || res.data.academic) {
          navigate('/dashboard');
        } else {
          navigate('/limbo');
        }
      }
    } catch (err) {
      setError('Demo login failed. Make sure the seed script has been run.');
      console.error(err);
    } finally {
      setDemoLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-900">
      {/* Image Section */}
      <div className="hidden lg:block lg:flex-[1.2] relative overflow-hidden group">
        <img
          src="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80"
          alt="Study Planning"
          className="w-full h-full object-cover opacity-90 transition-transform duration-[10s] group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-teal-600/85 to-indigo-500/75 flex flex-col justify-center items-center p-16 text-center">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute w-20 h-20 top-[10%] left-[10%] rounded-full bg-white/10 animate-float"></div>
            <div className="absolute w-32 h-32 top-[60%] left-[80%] rounded-full bg-white/10 animate-float" style={{ animationDelay: '1s' }}></div>
          </div>
          <h2 className="font-serif text-6xl text-white mb-6 drop-shadow-2xl leading-tight">
            Plan Smarter<br />Achieve More
          </h2>
          <p className="text-xl text-white/95 max-w-md leading-relaxed">
            Transform your academic journey with intelligent planning tools and a shared class notice board.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-10 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 50%, #eef2ff 100%)' }}>
        {/* Decorative background orbs */}
        <div className="absolute top-[-5%] right-[-5%] w-64 h-64 rounded-full bg-teal-300/20 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-5%] left-[-5%] w-64 h-64 rounded-full bg-indigo-300/15 blur-[80px] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-600 via-teal-500 to-teal-400"></div>

        <div className="w-full max-w-[460px] relative z-10 card-modern card-light p-8 sm:p-10 shadow-[0_8px_40px_rgba(15,23,42,0.12)] border-slate-200">
          <div className="flex items-center gap-4 mb-8">
            <img src="/logo.png" alt="Study Ease" className="h-16 w-auto object-contain shrink-0" onError={(e) => e.target.style.display='none'} />
            <div className="flex flex-col justify-center">
              <h1 className="font-sans text-4xl font-black tracking-tight leading-none">
                <span className="text-slate-900">Study </span>
                <span className="text-teal-500">Ease</span>
              </h1>
              <p className="text-sm text-slate-500 font-bold tracking-wide mt-1">Simpler learning, better results.</p>
            </div>
          </div>

          <div className="mt-10">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {isLogin ? 'Welcome back! 👋' : 'Get Started ✨'}
              </h2>
              <p className="text-slate-500 text-lg">
                {isLogin ? 'Sign in to continue your journey' : 'Create your account today'}
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-6">
              {!isLogin && (
                <div className="space-y-2">
                  <label htmlFor="full-name" className="block font-semibold text-slate-700 text-sm tracking-wide">Full Name</label>
                  <div className="relative group">
                    <input
                      id="full-name"
                      type="text"
                      placeholder="Enter your name"
                      className="input-field"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required
                    />
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="email-address" className="block font-semibold text-slate-700 text-sm tracking-wide">Email Address</label>
                <div className="relative group">
                  <input
                    id="email-address"
                    type="email"
                    placeholder="Enter your email"
                    className="input-field"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="block font-semibold text-slate-700 text-sm tracking-wide">Password</label>
                <div className="relative group">
                  <input
                    id="password"
                    type="password"
                    placeholder={isLogin ? 'Enter your password' : 'Min. 8 characters'}
                    className="input-field"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={isLogin ? undefined : 8}
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                </div>
              </div>

              <button type="submit" className="btn mt-2" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <p className="text-center mt-8 text-slate-500 font-medium">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-teal-600 font-bold hover:underline"
              >
                {isLogin ? 'Create one' : 'Sign in'}
              </button>
            </p>

            {/* Demo Quick Access */}
            {isLogin && (
              <div className="mt-8 pt-8 border-t border-slate-200">
                <div className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Quick Demo Access</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => { setEmail(DEMO_ACCOUNTS.student.email); setPassword(DEMO_ACCOUNTS.student.password); setError(''); }}
                    className="p-3 rounded-xl cursor-pointer transition-all duration-300 border-2 text-center bg-gradient-to-br from-teal-50 to-teal-100 hover:-translate-y-1 hover:shadow-lg border-teal-200"
                    aria-label="Demo login as Student"
                  >
                    <GraduationCap className="w-6 h-6 mx-auto mb-1 text-teal-700" />
                    <div className="text-xs font-bold text-teal-800">Student</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail(DEMO_ACCOUNTS.cr.email); setPassword(DEMO_ACCOUNTS.cr.password); setError(''); }}
                    className="p-3 rounded-xl cursor-pointer transition-all duration-300 border-2 text-center bg-gradient-to-br from-violet-50 to-violet-100 hover:-translate-y-1 hover:shadow-lg border-violet-200"
                    aria-label="Demo login as CR"
                  >
                    <Crown className="w-6 h-6 mx-auto mb-1 text-violet-700" />
                    <div className="text-xs font-bold text-violet-800">CR</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail(DEMO_ACCOUNTS.moderator.email); setPassword(DEMO_ACCOUNTS.moderator.password); setError(''); }}
                    className="p-3 rounded-xl cursor-pointer transition-all duration-300 border-2 text-center bg-gradient-to-br from-blue-50 to-blue-100 hover:-translate-y-1 hover:shadow-lg border-blue-200"
                    aria-label="Demo login as Moderator"
                  >
                    <BookOpen className="w-6 h-6 mx-auto mb-1 text-blue-700" />
                    <div className="text-xs font-bold text-blue-800">Moderator</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail(DEMO_ACCOUNTS.admin.email); setPassword(DEMO_ACCOUNTS.admin.password); setError(''); }}
                    className="p-3 rounded-xl cursor-pointer transition-all duration-300 border-2 text-center bg-gradient-to-br from-slate-100 to-slate-200 hover:-translate-y-1 hover:shadow-lg border-slate-300"
                    aria-label="Demo login as Admin"
                  >
                    <Wrench className="w-6 h-6 mx-auto mb-1 text-slate-700" />
                    <div className="text-xs font-bold text-slate-800">Admin</div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
