import { Link } from 'react-router-dom';
import { ShoppingCart, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/utils';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    compare_at_price: number | null;
    image_url: string | null;
    stock_quantity: number;
    is_featured: boolean;
  };
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addToCart } = useCart();
  const discount = product.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product.id);
  };

  return (
    <Link to={`/product/${product.slug}`}>
      <Card className="group card-hover overflow-hidden bg-card border-border/50">
        <div className="relative aspect-square overflow-hidden bg-secondary/30">
          <img
            src={product.image_url || '/placeholder.svg'}
            alt={product.name}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
          />
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            {discount > 0 && (
              <Badge className="gradient-accent border-0 text-accent-foreground">
                -{discount}%
              </Badge>
            )}
            {product.stock_quantity === 0 && (
              <Badge variant="secondary">Out of Stock</Badge>
            )}
          </div>

          {/* Quick Actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-full shadow-md"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>

          {/* Add to Cart Button */}
          <div className="absolute bottom-3 left-3 right-3 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            <Button
              onClick={handleAddToCart}
              disabled={product.stock_quantity === 0}
              className="w-full gradient-primary border-0 shadow-lg"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          </div>
        </div>

        <CardContent className="p-4">
          <h3 className="font-medium text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-primary">
              {formatPrice(product.price)}
            </span>
            {product.compare_at_price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.compare_at_price)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default ProductCard;
