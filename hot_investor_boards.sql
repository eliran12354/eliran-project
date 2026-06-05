-- Run once in PostgreSQL (e.g. pgAdmin) before using לוחות נדל״ן חמים למשקיעים

-- Listings table
CREATE TABLE IF NOT EXISTS public.hot_investor_board_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('pinui_binui', 'up_to_1m', 'land_thaw')),
  title text NOT NULL,
  subtitle text,
  description text,
  price_label text,
  location_label text,
  contact_phone text,
  contact_email text,
  external_link text,
  image_url text,
  display_order integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hot_investor_board_listings_category_idx
  ON public.hot_investor_board_listings (category);
CREATE INDEX IF NOT EXISTS hot_investor_board_listings_published_idx
  ON public.hot_investor_board_listings (is_published);

-- Notification opt-in
ALTER TABLE public.user_notification_preferences
  ADD COLUMN IF NOT EXISTS notify_hot_investor_boards_new boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.user_notification_preferences.notify_hot_investor_boards_new IS
  'User opted in to in-app notifications when a new hot investor board listing is published';
