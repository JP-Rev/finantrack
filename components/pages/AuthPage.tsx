import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Button from '../common/Button';
import Input from '../common/Input';
import { APP_NAME } from '../../constants';

const AuthPage: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

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
      setError(error.message || 'Ocurrió un error durante la autenticación');
    } finally {
      setLoading(false);
    }
  };

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

          <div className="mt-6 text-center">
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
        </div>

        <div className="text-center text-sm text-text-secondary">
          <p>Gestiona tus finanzas personales de forma segura</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;