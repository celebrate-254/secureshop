import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Minus, Plus, ShoppingCart, Heart, Share2, ChevronLeft, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import Layout from '@/components/layout/Layout';
import ProductGrid from '@/components/products/ProductGrid';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/utils';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  image_url: string | null;
  images: string[];
  stock_quantity: number;
  is_featured: boolean;
  category_id: string | null;
}

const ProductDetail = () => {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;

      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .single();

      if (data) {
        setProduct(data);
        
        // Fetch related products
        if (data.category_id) {
          const { data: related } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', data.category_id)
            .eq('is_active', true)
            .neq('id', data.id)
            .limit(4);
          
          if (related) setRelatedProducts(related);
        }
      }
      setLoading(false);
    };

    fetchProduct();
  }, [slug]);

  const handleAddToCart = () => {
    if (product) {
      addToCart(product.id, quantity);
    }
  };

  const allImages = product
    ? [product.image_url, ...(product.images || [])].filter(Boolean) as string[]
    : [];

  const discount = product?.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <Link to="/products">
            <Button>Back to Products</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Link
          to="/products"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Products
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square rounded-xl overflow-hidden bg-secondary/30">
              <img
                src={allImages[selectedImage] || '/placeholder.svg'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-20 h-20 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                      selectedImage === idx ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {discount > 0 && (
                  <Badge className="gradient-accent border-0">-{discount}% OFF</Badge>
                )}
                {product.stock_quantity <= 5 && product.stock_quantity > 0 && (
                  <Badge variant="outline" className="text-warning border-warning">
                    Only {product.stock_quantity} left
                  </Badge>
                )}
              </div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-4">
                {product.name}
              </h1>
              
              {/* Rating */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < 4 ? 'text-accent fill-accent' : 'text-muted'}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">(24 reviews)</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-primary">
                {formatPrice(product.price)}
              </span>
              {product.compare_at_price && (
                <span className="text-xl text-muted-foreground line-through">
                  {formatPrice(product.compare_at_price)}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed">
              {product.description}
            </p>

            {/* Quantity & Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Quantity:</span>
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    disabled={quantity >= product.stock_quantity}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleAddToCart}
                  disabled={product.stock_quantity === 0}
                  className="flex-1 gradient-primary border-0 h-12"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                </Button>
                <Button variant="outline" size="icon" className="h-12 w-12">
                  <Heart className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="icon" className="h-12 w-12">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Stock Status */}
            {product.stock_quantity > 0 && (
              <p className="text-sm text-success flex items-center gap-2">
                <span className="w-2 h-2 bg-success rounded-full" />
                In Stock ({product.stock_quantity} available)
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="description" className="mb-16">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
            <TabsTrigger value="shipping">Shipping</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-6">
            <div className="prose max-w-none">
              <p className="text-muted-foreground">{product.description}</p>
            </div>
          </TabsContent>
          <TabsContent value="reviews" className="mt-6">
            <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
          </TabsContent>
          <TabsContent value="shipping" className="mt-6">
            <div className="space-y-4 text-muted-foreground">
              <p>Free shipping on orders over KES 5,000</p>
              <p>Estimated delivery: 2-5 business days</p>
              <p>Delivery to all major towns in Kenya</p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="font-display text-2xl font-bold text-foreground mb-6">
              Related Products
            </h2>
            <ProductGrid products={relatedProducts} />
          </section>
        )}
      </div>
    </Layout>
  );
};

export default ProductDetail;
