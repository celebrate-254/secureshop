import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shield, Truck, CreditCard, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Layout from '@/components/layout/Layout';
import ProductGrid from '@/components/products/ProductGrid';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  stock_quantity: number;
  is_featured: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

const features = [
  {
    icon: Shield,
    title: 'Secure Payments',
    description: 'M-Pesa integration with end-to-end encryption',
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    description: 'Nationwide delivery within 2-5 business days',
  },
  {
    icon: CreditCard,
    title: 'Easy Checkout',
    description: 'Simple STK Push payment process',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Customer service available round the clock',
  },
];

const Index = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [productsRes, categoriesRes] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('is_featured', true)
          .eq('is_active', true)
          .limit(8),
        supabase
          .from('categories')
          .select('*')
          .limit(5),
      ]);

      if (productsRes.data) setFeaturedProducts(productsRes.data);
      if (categoriesRes.data) setCategories(categoriesRes.data);
      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative gradient-hero text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920')] bg-cover bg-center opacity-10" />
        <div className="container mx-auto px-4 py-20 md:py-32 relative">
          <div className="max-w-2xl animate-fade-in">
            <h1 className="font-display text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Shop Smart,
              <br />
              <span className="text-accent">Pay Secure</span>
            </h1>
            <p className="text-lg md:text-xl opacity-90 mb-8">
              Discover quality products with secure M-Pesa payments. 
              Kenya's trusted e-commerce destination for electronics, fashion, and more.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products">
                <Button size="lg" className="bg-card text-foreground hover:bg-card/90">
                  Shop Now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/categories">
                <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  Browse Categories
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Features Section */}
      <section className="py-12 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="flex flex-col items-center text-center p-4 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center mb-3">
                  <feature.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground mb-2">
                Shop by Category
              </h2>
              <p className="text-muted-foreground">
                Explore our wide range of product categories
              </p>
            </div>
            <Link to="/categories">
              <Button variant="ghost">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                to={`/products?category=${category.slug}`}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Card className="card-hover overflow-hidden group">
                  <div className="aspect-square relative bg-secondary/50">
                    {category.image_url ? (
                      <img
                        src={category.image_url}
                        alt={category.name}
                        className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center gradient-primary opacity-20" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent flex items-end p-4">
                      <h3 className="font-semibold text-background">{category.name}</h3>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground mb-2">
                Featured Products
              </h2>
              <p className="text-muted-foreground">
                Handpicked selections just for you
              </p>
            </div>
            <Link to="/products">
              <Button variant="ghost">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>

          <ProductGrid products={featuredProducts} loading={loading} />
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="gradient-primary overflow-hidden border-0">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
                Start Shopping Today
              </h2>
              <p className="text-lg text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
                Join thousands of satisfied customers. Create an account and enjoy 
                exclusive deals and seamless M-Pesa checkout.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/signup">
                  <Button size="lg" className="bg-card text-foreground hover:bg-card/90">
                    Create Account
                  </Button>
                </Link>
                <Link to="/products">
                  <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                    Browse Products
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};

export default Index;
