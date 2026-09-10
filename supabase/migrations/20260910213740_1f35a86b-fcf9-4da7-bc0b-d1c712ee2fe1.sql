-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Shared updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Figures
CREATE TABLE public.site_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  value text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_metrics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_metrics TO authenticated;
GRANT ALL ON public.site_metrics TO service_role;
ALTER TABLE public.site_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view figures"
  ON public.site_metrics FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage figures"
  ON public.site_metrics FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_site_metrics_updated_at
  BEFORE UPDATE ON public.site_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Alerts
CREATE TABLE public.site_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  level text NOT NULL DEFAULT 'info',
  published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_alerts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_alerts TO authenticated;
GRANT ALL ON public.site_alerts TO service_role;
ALTER TABLE public.site_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published alerts"
  ON public.site_alerts FOR SELECT TO anon, authenticated
  USING (published = true);

CREATE POLICY "Admins can view all alerts"
  ON public.site_alerts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage alerts"
  ON public.site_alerts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_site_alerts_updated_at
  BEFORE UPDATE ON public.site_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_metrics (label, value, description, sort_order) VALUES
  ('States covered', '36 + FCT', 'Satellite parcel mapping available nationwide.', 1),
  ('Crops supported', '8', 'Maize, rice, cassava, yam, sorghum, cowpea, cocoa and oil palm.', 2),
  ('Smallest farm size', '1 hectare', 'Guidance is written for smallholder plots and up.', 3);

INSERT INTO public.site_alerts (title, message, level, published, sort_order) VALUES
  ('Rainfall update', 'Steady rains expected across the middle belt this week — good planting window for maize.', 'info', true, 1);