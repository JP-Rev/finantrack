import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Button from '../common/Button';
import Input from '../common/Input';
import { APP_NAME } from '../../constants';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);

  useEffect(() => {
    // Verificar si hay parámetros de error en la URL
    const urlParams = new URLSearchParams(location.hash.substring(1));
    const errorParam = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    if (errorParam) {
      if (errorParam === 'access_denied' && errorDescription?.includes('expired')) {
        setError('El enlace de recuperación ha expirado. Por favor, solicita un nuevo enlace de recuperación.');
        setHasValidSession(false);
        return;
      } else {
        setError(`Error: ${errorDescription || errorParam}`);
        setHasValidSession(false);
        return;
      }
    }

    // Verificar si hay una sesión de recuperación activa
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking session:', error);
          setError('Error al verificar la sesión. Por favor, solicita un nuevo enlace de recuperación.');
          setHasValidSession(false);
          return;
        }

        if (!session) {
          setError('No hay una sesión de recuperación activa. Por favor, solicita un nuevo enlace de recuperación.');
          setHasValidSession(false);
          return;
        }

        // Verificar que la sesión sea para recuperación de contraseña
        if (session.user && session.user.aud === 'authenticated') {
          setHasValidSession(true);
        } else {
          setError('Sesión inválida para recuperación de contraseña. Por favor, solicita un nuevo enlace.');
          setHasValidSession(false);
        }
      } catch (error) {
        console.error('Error in checkSession:', error);
        setError('Error al verificar la sesión. Por favor, intenta nuevamente.');
        setHasValidSession(false);
      }
    };

    checkSession();
  }, [location]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setMessage('¡Contraseña actualizada exitosamente! Serás redirigido al inicio de sesión.');
      
      // Cerrar sesión y redirigir después de 2 segundos
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/');
      }, 2000);

    } catch (error: any) {
      console.error('Reset password error:', error);
      if (error.message?.includes('session_not_found') || error.message?.includes('invalid_session')) {
        setError('La sesión ha expirado. Por favor, solicita un nuevo enlace de recuperación.');
      } else {
        setError(error.message || 'Error al actualizar la contraseña');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewLink = () => {
    navigate('/');
  };

  // Mostrar loading mientras verificamos la sesión
  if (hasValidSession === null) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary mb-2">{APP_NAME}</h1>
            <p className="text-text-secondary">Verificando enlace de recuperación...</p>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay sesión válida, mostrar error y opción para solicitar nuevo enlace
  if (!hasValidSession) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary mb-2">{APP_NAME}</h1>
            <h2 className="text-2xl font-semibold text-danger">
              Enlace Inválido o Expirado
            </h2>
          </div>

          <div className="bg-card-bg p-8 rounded-lg shadow-xl">
            <div className="mb-6 p-4 bg-danger/10 text-danger rounded-md text-sm">
              {error}
            </div>

            <div className="space-y-4">
              <p className="text-text-secondary text-center">
                Los enlaces de recuperación de contraseña expiran después de un tiempo por seguridad.
              </p>
              
              <Button
                type="button"
                variant="primary"
                className="w-full"
                onClick={handleRequestNewLink}
              >
                Solicitar nuevo enlace de recuperación
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-text-secondary">
            <p>¿Recordaste tu contraseña?</p>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-primary hover:text-primary-hover font-medium"
            >
              Volver al inicio de sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Formulario para cambiar contraseña (sesión válida)
  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">{APP_NAME}</h1>
          <h2 className="text-2xl font-semibold text-text-principal">
            Nueva Contraseña
          </h2>
          <p className="mt-2 text-text-secondary">
            Ingresa tu nueva contraseña
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
              label="Nueva contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Ingresa tu nueva contraseña"
              disabled={loading}
              minLength={6}
            />

            <Input
              label="Confirmar contraseña"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirma tu nueva contraseña"
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
              Actualizar contraseña
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-text-secondary hover:text-primary text-sm"
              disabled={loading}
            >
              ← Volver al inicio
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

export default ResetPasswordPage;