import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Button from '../common/Button';
import Input from '../common/Input';
import { APP_NAME } from '../../constants';

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Verificar si hay una sesión de recuperación activa
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Enlace de recuperación inválido o expirado. Por favor, solicita uno nuevo.');
      }
    };
    checkSession();
  }, []);

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
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error: any) {
      console.error('Reset password error:', error);
      setError(error.message || 'Error al actualizar la contraseña');
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