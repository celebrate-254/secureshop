-- Create categories table
CREATE TABLE public.categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    compare_at_price DECIMAL(10,2),
    image_url TEXT,
    images TEXT[] DEFAULT '{}',
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    phone_number TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create addresses table
CREATE TABLE public.addresses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT NOT NULL,
    county TEXT,
    postal_code TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cart_items table
CREATE TABLE public.cart_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, product_id)
);

-- Create orders table
CREATE TABLE public.orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled')),
    subtotal DECIMAL(10,2) NOT NULL,
    shipping_fee DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    shipping_address_id UUID REFERENCES public.addresses(id),
    payment_method TEXT DEFAULT 'mpesa',
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed')),
    mpesa_checkout_request_id TEXT,
    mpesa_receipt_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    product_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_reviews table
CREATE TABLE public.product_reviews (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    comment TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(product_id, user_id)
);

-- Create user_roles table for admin access
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    
    -- Assign default user role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies

-- Categories: Public read
CREATE POLICY "Categories are viewable by everyone"
    ON public.categories FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Products: Public read for active products
CREATE POLICY "Active products are viewable by everyone"
    ON public.products FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage products"
    ON public.products FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Profiles: Users can view and update their own
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Addresses: Users manage their own
CREATE POLICY "Users can view their own addresses"
    ON public.addresses FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own addresses"
    ON public.addresses FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses"
    ON public.addresses FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses"
    ON public.addresses FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Cart items: Users manage their own
CREATE POLICY "Users can view their own cart"
    ON public.cart_items FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their cart"
    ON public.cart_items FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their cart"
    ON public.cart_items FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can remove from their cart"
    ON public.cart_items FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Orders: Users view their own, admins view all
CREATE POLICY "Users can view their own orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create their own orders"
    ON public.orders FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update orders"
    ON public.orders FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin') OR (auth.uid() = user_id AND status = 'pending'));

-- Order items: Same as orders
CREATE POLICY "Users can view their order items"
    ON public.order_items FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (orders.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
        )
    );

CREATE POLICY "Users can create order items"
    ON public.order_items FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND orders.user_id = auth.uid()
        )
    );

-- Reviews: Public read, auth write
CREATE POLICY "Reviews are viewable by everyone"
    ON public.product_reviews FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create reviews"
    ON public.product_reviews FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews"
    ON public.product_reviews FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews"
    ON public.product_reviews FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- User roles: Only admins can manage
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- Insert seed data for categories
INSERT INTO public.categories (name, slug, description) VALUES
    ('Electronics', 'electronics', 'Phones, laptops, gadgets and accessories'),
    ('Fashion', 'fashion', 'Clothing, shoes, and accessories'),
    ('Home & Garden', 'home-garden', 'Furniture, decor, and outdoor items'),
    ('Beauty & Health', 'beauty-health', 'Cosmetics, skincare, and wellness products'),
    ('Sports & Outdoors', 'sports-outdoors', 'Fitness equipment and outdoor gear');

-- Insert sample products
INSERT INTO public.products (name, slug, description, price, compare_at_price, image_url, category_id, stock_quantity, is_featured) VALUES
    ('Wireless Bluetooth Headphones', 'wireless-bluetooth-headphones', 'High-quality noise-cancelling wireless headphones with 30-hour battery life', 4999.00, 6500.00, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', (SELECT id FROM public.categories WHERE slug = 'electronics'), 50, true),
    ('Smart Watch Pro', 'smart-watch-pro', 'Advanced fitness tracking, heart rate monitoring, and smartphone notifications', 12500.00, 15000.00, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', (SELECT id FROM public.categories WHERE slug = 'electronics'), 30, true),
    ('Leather Crossbody Bag', 'leather-crossbody-bag', 'Genuine leather handcrafted bag with adjustable strap', 3500.00, NULL, 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', (SELECT id FROM public.categories WHERE slug = 'fashion'), 25, true),
    ('Running Shoes Elite', 'running-shoes-elite', 'Lightweight performance running shoes with responsive cushioning', 8999.00, 10500.00, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', (SELECT id FROM public.categories WHERE slug = 'sports-outdoors'), 40, true),
    ('Organic Face Serum', 'organic-face-serum', 'Natural vitamin C serum for radiant and youthful skin', 2200.00, 2800.00, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400', (SELECT id FROM public.categories WHERE slug = 'beauty-health'), 60, false),
    ('Modern Table Lamp', 'modern-table-lamp', 'Minimalist LED desk lamp with adjustable brightness', 1800.00, NULL, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400', (SELECT id FROM public.categories WHERE slug = 'home-garden'), 35, false),
    ('Smartphone Stand', 'smartphone-stand', 'Adjustable aluminum phone and tablet stand for desk', 850.00, 1200.00, 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400', (SELECT id FROM public.categories WHERE slug = 'electronics'), 100, false),
    ('Cotton T-Shirt Pack', 'cotton-tshirt-pack', 'Premium cotton t-shirts, pack of 3 in assorted colors', 1500.00, 2000.00, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', (SELECT id FROM public.categories WHERE slug = 'fashion'), 80, false);