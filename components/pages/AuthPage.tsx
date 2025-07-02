import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Button from '../common/Button';
import Input from '../common/Input';
import { APP_NAME } from '../../constants';

const AuthPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearTimeout(cooldownTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  const startCooldown = () => {
    setCooldown(true);
    setCooldownSeconds(15);

    // Start countdown timer
    countdownTimerRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Start cooldown timer
    cooldownTimerRef.current = setTimeout(() => {
      setCooldown(false);
      setCooldownSeconds(0);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    }, 15000);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('¡Cuenta creada exitosamente! Ya puedes iniciar sesión.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      setError(error.message || 'Ocurrió un error durante la autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    if (cooldown) {
      setError(`Debes esperar ${cooldownSeconds} segundos antes de intentar nuevamente`);
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/#/reset-password`
      });
      
      if (error) throw error;
      
      setMessage('Se ha enviado un enlace de recuperación a tu correo electrónico. Revisa tu bandeja de entrada y sigue las instrucciones.');
      setShowResetPassword(false);
      
      // Start cooldown after successful request
      startCooldown();
    } catch (error: any) {
      console.error('Reset password error:', error);
      
      // Check if it's a rate limit error
      if (error.message?.includes('10 seconds') || 
          error.message?.includes('rate_limit') || 
          error.message?.includes('email_send_rate_limit')) {
        setError('Has enviado demasiadas solicitudes. Espera un momento antes de intentar nuevamente.');
        startCooldown();
      } else if (error.message?.includes('Invalid email')) {
        setError('El correo electrónico ingresado no es válido.');
      } else if (error.message?.includes('User not found')) {
        setError('No existe una cuenta con este correo electrónico.');
      } else {
        setError(error.message || 'Error al enviar el correo de recuperación');
      }
    } finally {
      setLoading(false);
    }
  };

  // Verificar si Supabase está configurado
  const supabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary mb-2">{APP_NAME}</h1>
            <h2 className="text-2xl font-semibold text-danger">Configuración Requerida</h2>
          </div>

          <div className="bg-card-bg p-8 rounded-lg shadow-xl">
            <div className="text-center">
              <p className="text-text-secondary mb-4">
                Para usar esta aplicación, necesitas configurar Supabase.
              </p>
              <div className="text-left bg-secondary p-4 rounded-md">
                <p className="text-sm font-mono text-text-secondary mb-2">
                  Crea un archivo .env con:
                </p>
                <pre className="text-xs text-text-principal">
{`VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima`}
                </pre>
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-4 px-4 py-2 bg-primary text-text-on-primary rounded-md hover:bg-primary-hover"
              >
                Verificar Configuración
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showResetPassword) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary mb-2">{APP_NAME}</h1>
            <h2 className="text-2xl font-semibold text-text-principal">
              Recuperar Contraseña
            </h2>
            <p className="mt-2 text-text-secondary">
              Ingresa tu correo electrónico para recibir un enlace de recuperación
            </p>
          </div>

          <div className="bg-card-bg p-8 rounded-lg shadow-xl">
            {error && (
              <div className="mb-4 p-3 bg-danger/10 text-danger rounded-md text-sm">
                {error}
              </div>
            )}
            
            {message && (
              <div className="mb-4 p-3 bg-success/10 text-success rounded-md text-sm">
                {message}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-6">
              <Input
                label="Correo electrónico"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
                disabled={loading}
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={loading}
                disabled={loading || cooldown}
              >
                {cooldown 
                  ? `Espera ${cooldownSeconds}s` 
                  : 'Enviar enlace de recuperación'
                }
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => {
                  setShowResetPassword(false);
                  setError('');
                  setMessage('');
                }}
                className="text-primary hover:text-primary-hover font-medium"
                disabled={loading}
              >
                ← Volver al inicio de sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">{APP_NAME}</h1>
          <h2 className="text-2xl font-semibold text-text-principal">
            {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
          </h2>
          <p className="mt-2 text-text-secondary">
            {isSignUp 
              ? 'Crea tu cuenta para comenzar a gestionar tus finanzas' 
              : 'Accede a tu cuenta para continuar'
            }
          </p>
        </div>

        <div className="bg-card-bg p-8 rounded-lg shadow-xl">
          {error && (
            <div className="mb-4 p-3 bg-danger/10 text-danger rounded-md text-sm">
              {error}
            </div>
          )}
          
          {message && (
            <div className="mb-4 p-3 bg-success/10 text-success rounded-md text-sm">
              {message}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-6">
            <Input
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tu@email.com"
              disabled={loading}
            />

            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Tu contraseña"
              disabled={loading}
              minLength={6}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={loading}
              disabled={loading}
            >
              {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                  setMessage('');
                }}
                className="text-primary hover:text-primary-hover font-medium"
                disabled={loading}
              >
                {isSignUp 
                  ? '¿Ya tienes cuenta? Inicia sesión' 
                  : '¿No tienes cuenta? Regístrate'
                }
              </button>
            </div>

            {!isSignUp && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPassword(true);
                    setError('');
                    setMessage('');
                  }}
                  className="text-text-secondary hover:text-primary text-sm"
                  disabled={loading}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-sm text-text-secondary">
          <p>Gestiona tus finanzas personales de forma segura</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;