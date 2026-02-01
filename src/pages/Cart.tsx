import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import Layout from '@/components/layout/Layout';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatPrice } from '@/lib/utils';

const Cart = () => {
  const { items, loading, subtotal, updateQuantity, removeFromCart } = useCart();
  const { user } = useAuth();

  const shippingFee = subtotal > 5000 ? 0 : 300;
  const total = subtotal + shippingFee;

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-4">Sign in to view your cart</h1>
          <p className="text-muted-foreground mb-8">
            Please sign in to add items to your cart and checkout.
          </p>
          <Link to="/login">
            <Button className="gradient-primary border-0">Sign In</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-muted-foreground mb-8">
            Looks like you haven't added anything to your cart yet.
          </p>
          <Link to="/products">
            <Button className="gradient-primary border-0">Start Shopping</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">
          Shopping Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Link
                      to={`/product/${item.product_id}`}
                      className="w-24 h-24 rounded-lg overflow-hidden bg-secondary/30 shrink-0"
                    >
                      <img
                        src={item.product.image_url || '/placeholder.svg'}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/product/${item.product_id}`}
                        className="font-medium text-foreground hover:text-primary line-clamp-2"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-lg font-bold text-primary mt-1">
                        {formatPrice(item.product.price)}
                      </p>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border rounded-lg">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock_quantity}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeFromCart(item.product_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="text-right hidden sm:block">
                      <p className="font-bold text-foreground">
                        {formatPrice(item.product.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-32">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="font-medium">
                    {shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}
                  </span>
                </div>
                {shippingFee > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Free shipping on orders over KES 5,000
                  </p>
                )}
                <Separator />
                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-primary">{formatPrice(total)}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Link to="/checkout" className="w-full">
                  <Button className="w-full gradient-primary border-0">
                    Proceed to Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Cart;
