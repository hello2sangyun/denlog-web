import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export function LoginOverlay() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Always request redirect to localhost:3000 so our local server catches it
          redirectTo: 'http://localhost:3000',
          skipBrowserRedirect: true,
        },
      });
      
      if (error) {
        alert("OAuth Error: " + error.message);
        throw error;
      }
      if (data?.url) {
        // Open the URL in the external browser securely
        try {
          if ((window as any).electron && (window as any).electron.openExternal) {
            (window as any).electron.openExternal(data.url);
          } else {
            window.location.href = data.url;
          }
        } catch (e) {
          window.location.href = data.url;
        }
      } else {
        alert("OAuth Error: No URL returned");
        throw new Error("No URL returned");
      }
    } catch (error: any) {
      console.error('Error logging in with Google:', error);
      alert("Catch Error: " + error.message);
      setIsLoggingIn(false);
    }
  };

  React.useEffect(() => {
    console.log("LOGIN OVERLAY MOUNTED!");
  }, []);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#FAFAF8] text-[#2D3748] animate-in fade-in duration-500 p-6">
      
      <div className="w-full max-w-[420px] bg-white rounded-[32px] shadow-[0_8px_40px_rgb(0,0,0,0.04)] border border-[#E2E8F0]/60 p-10 sm:p-12 flex flex-col items-center animate-in slide-in-from-bottom-8 duration-700 delay-150">
        
        {/* Top Section */}
        <img 
          src="/logo_new.png?v=2" 
          alt="Denlog" 
          className="h-[40px] max-w-full mb-3 object-contain" 
        />
        <p className="text-[16px] text-[#718096] font-medium tracking-wide mb-10 text-center">
          Every conversation becomes action.
        </p>

        {/* Divider */}
        <div className="flex items-center gap-4 w-full mb-6">
          <div className="flex-1 h-px bg-[#E2E8F0]"></div>
          <span className="text-[11px] font-bold text-[#A0AEC0] uppercase tracking-widest">Sign In</span>
          <div className="flex-1 h-px bg-[#E2E8F0]"></div>
        </div>

        {/* Google Button */}
        <button 
          className="w-full h-[52px] rounded-2xl text-[15px] font-bold shadow-sm flex items-center justify-center gap-3 bg-white border border-[#E2E8F0] text-[#2D3748] hover:bg-gray-50 transition-all hover:scale-[0.98] active:scale-95 mb-6"
          onClick={handleGoogleLogin}
          disabled={isLoggingIn}
        >
          {isLoggingIn ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Continue with Google
        </button>

        {/* Legal Text */}
        <p className="text-[12px] text-[#A0AEC0] leading-relaxed text-center px-4">
          By continuing, you agree to our <br className="sm:hidden" />
          <a href="https://hello2sangyun.github.io/denlog/terms-en.html" target="_blank" className="font-semibold text-primary hover:underline">Terms of Service</a> and <a href="https://hello2sangyun.github.io/denlog/privacy-en.html" target="_blank" className="font-semibold text-primary hover:underline">Privacy Policy</a>.
        </p>

      </div>
    </div>
  );
}
