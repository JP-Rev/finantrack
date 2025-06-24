/*
  # Esquema inicial para FinanTrack

  1. Nuevas Tablas
    - `accounts` - Cuentas de usuario (efectivo, tarjetas, USD, etc.)
      - `id` (uuid, primary key)
      - `name` (text, nombre de la cuenta)
      - `type` (text, tipo de cuenta: efectivo, tarjeta, usd, otro)
      - `currency` (text, moneda: ARS, USD)
      - `balance` (numeric, saldo actual)
      - `created_at` (timestamp)
    
    - `categories` - Categorías principales
      - `id` (uuid, primary key)
      - `name` (text, nombre de la categoría)
      - `created_at` (timestamp)
    
    - `subcategories` - Subcategorías
      - `id` (uuid, primary key)
      - `name` (text, nombre de la subcategoría)
      - `category_id` (uuid, referencia a categories)
      - `created_at` (timestamp)
    
    - `movements` - Movimientos/transacciones
      - `id` (uuid, primary key)
      - `type` (text, tipo: ingreso, gasto)
      - `date` (date, fecha del movimiento)
      - `amount` (numeric, monto)
      - `description` (text, descripción)
      - `account_id` (uuid, referencia a accounts)
      - `subcategory_id` (uuid, referencia a subcategories, opcional)
      - `installment_plan_id` (uuid, referencia a installment_plans, opcional)
      - `installment_number` (integer, número de cuota, opcional)
      - `related_transfer_id` (text, ID de transferencia relacionada, opcional)
      - `created_at` (timestamp)
    
    - `installment_plans` - Planes de cuotas
      - `id` (uuid, primary key)
      - `start_date` (date, fecha de inicio)
      - `installment_amount` (numeric, monto por cuota)
      - `number_of_installments` (integer, número de cuotas)
      - `description` (text, descripción del plan)
      - `account_id` (uuid, referencia a accounts)
      - `created_at` (timestamp)

  2. Seguridad
    - Habilitar RLS en todas las tablas
    - Políticas para usuarios autenticados puedan acceder a sus propios datos

  3. Datos iniciales
    - Categorías básicas (Comida, Transporte, Salario, Transferencias)
    - Subcategorías de ejemplo
*/

-- Crear tabla de cuentas
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('efectivo', 'tarjeta', 'usd', 'otro')),
  currency text NOT NULL CHECK (currency IN ('ARS', 'USD')),
  balance numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de subcategorías
CREATE TABLE IF NOT EXISTS subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(name, category_id)
);

-- Crear tabla de planes de cuotas
CREATE TABLE IF NOT EXISTS installment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date date NOT NULL,
  installment_amount numeric NOT NULL,
  number_of_installments integer NOT NULL,
  description text NOT NULL,
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Crear tabla de movimientos
CREATE TABLE IF NOT EXISTS movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('ingreso', 'gasto')),
  date date NOT NULL,
  amount numeric NOT NULL,
  description text NOT NULL DEFAULT '',
  account_id uuid REFERENCES accounts(id) ON DELETE CASCADE,
  subcategory_id uuid REFERENCES subcategories(id) ON DELETE SET NULL,
  installment_plan_id uuid REFERENCES installment_plans(id) ON DELETE SET NULL,
  installment_number integer,
  related_transfer_id text,
  created_at timestamptz DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE installment_plans ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para accounts
CREATE POLICY "Users can manage their own accounts"
  ON accounts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas RLS para categories (todos pueden leer, solo autenticados pueden modificar)
CREATE POLICY "Anyone can read categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage categories"
  ON categories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas RLS para subcategories
CREATE POLICY "Users can manage subcategories"
  ON subcategories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas RLS para movements
CREATE POLICY "Users can manage their own movements"
  ON movements
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Políticas RLS para installment_plans
CREATE POLICY "Users can manage their own installment plans"
  ON installment_plans
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insertar categorías iniciales
INSERT INTO categories (name) VALUES 
  ('Comida'),
  ('Transporte'),
  ('Salario'),
  ('Transferencias')
ON CONFLICT (name) DO NOTHING;

-- Insertar subcategorías iniciales
DO $$
DECLARE
  food_cat_id uuid;
  transport_cat_id uuid;
BEGIN
  -- Obtener ID de categoría Comida
  SELECT id INTO food_cat_id FROM categories WHERE name = 'Comida';
  
  -- Obtener ID de categoría Transporte
  SELECT id INTO transport_cat_id FROM categories WHERE name = 'Transporte';
  
  -- Insertar subcategorías de Comida
  IF food_cat_id IS NOT NULL THEN
    INSERT INTO subcategories (name, category_id) VALUES 
      ('Supermercado', food_cat_id),
      ('Restaurantes', food_cat_id)
    ON CONFLICT (name, category_id) DO NOTHING;
  END IF;
  
  -- Insertar subcategorías de Transporte
  IF transport_cat_id IS NOT NULL THEN
    INSERT INTO subcategories (name, category_id) VALUES 
      ('Combustible', transport_cat_id)
    ON CONFLICT (name, category_id) DO NOTHING;
  END IF;
END $$;

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_movements_account_id ON movements(account_id);
CREATE INDEX IF NOT EXISTS idx_movements_date ON movements(date);
CREATE INDEX IF NOT EXISTS idx_movements_type ON movements(type);
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_installment_plans_account_id ON installment_plans(account_id);