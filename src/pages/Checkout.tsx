import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MapPin, CreditCard, Loader2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import Layout from '@/components/layout/Layout';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice, formatPhoneNumber, generateOrderNumber } from '@/lib/utils';
import { toast } from 'sonner';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, subtotal, clearCart } = useCart();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'pay_on_delivery'>('mpesa');
  const [formData, setFormData] = useState({
    fullName: profile?.full_name || '',
    phone: profile?.phone_number || '',
    addressLine1: '',
    city: 'Nairobi',
    county: 'Nairobi',
  });

  const shippingFee = subtotal > 5000 ? 0 : 300;
  const total = subtotal + shippingFee;

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/checkout' } });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to continue');
      return;
    }

    setLoading(true);

    try {
      // Create address
      const { data: address, error: addressError } = await supabase
        .from('addresses')
        .insert({
          user_id: user.id,
          full_name: formData.fullName,
          phone_number: formData.phone,
          address_line1: formData.addressLine1,
          city: formData.city,
          county: formData.county,
          is_default: true,
        })
        .select()
        .single();

      if (addressError) throw addressError;

      // Create order
      const orderNumber = generateOrderNumber();
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: paymentMethod === 'pay_on_delivery' ? 'confirmed' : 'pending',
          subtotal: subtotal,
          shipping_fee: shippingFee,
          total_amount: total,
          shipping_address_id: address.id,
          payment_method: paymentMethod,
          payment_status: paymentMethod === 'pay_on_delivery' ? 'pending_delivery' : 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product.name,
        product_price: item.product.price,
        quantity: item.quantity,
        total_price: item.product.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Handle payment based on method
      if (paymentMethod === 'pay_on_delivery') {
        // For pay on delivery, just place the order
        toast.success('Order placed successfully! Pay when your order arrives.');
        await clearCart();
        navigate(`/orders/${order.id}`);
        return;
      }

      // Initiate M-Pesa payment
      setProcessingPayment(true);
      
      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          phoneNumber: formatPhoneNumber(formData.phone),
          amount: Math.round(total),
          orderId: order.id,
          orderNumber: orderNumber,
        },
      });

      if (paymentError) {
        // Payment initiation failed, but order is created
        toast.error('Payment initiation failed. You can retry from your orders.');
        await clearCart();
        navigate(`/orders/${order.id}`);
        return;
      }

      if (paymentData?.success) {
        // Update order with checkout request ID
        await supabase
          .from('orders')
          .update({
            mpesa_checkout_request_id: paymentData.checkoutRequestId,
            payment_status: 'processing',
          })
          .eq('id', order.id);

        toast.success('Payment request sent! Check your phone for the M-Pesa prompt.');
        await clearCart();
        navigate(`/orders/${order.id}?payment=pending`);
      } else {
        toast.error(paymentData?.message || 'Payment failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
      setProcessingPayment(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">Checkout</h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Shipping & Payment */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="0712345678"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addressLine1">Address</Label>
                    <Input
                      id="addressLine1"
                      name="addressLine1"
                      placeholder="Street address, building, floor"
                      value={formData.addressLine1}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="county">County</Label>
                      <Input
                        id="county"
                        name="county"
                        value={formData.county}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup 
                    value={paymentMethod} 
                    onValueChange={(value: 'mpesa' | 'pay_on_delivery') => setPaymentMethod(value)}
                    className="space-y-3"
                  >
                    <div className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${paymentMethod === 'mpesa' ? 'border-primary bg-primary/5' : ''}`}>
                      <RadioGroupItem value="mpesa" id="mpesa" />
                      <label htmlFor="mpesa" className="flex items-center gap-3 cursor-pointer flex-1">
                        <div className="w-12 h-12 bg-[#4CAF50] rounded-lg flex items-center justify-center">
                          <Phone className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">M-Pesa</p>
                          <p className="text-sm text-muted-foreground">
                            Pay securely with M-Pesa STK Push
                          </p>
                        </div>
                      </label>
                    </div>
                    <div className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-colors ${paymentMethod === 'pay_on_delivery' ? 'border-primary bg-primary/5' : ''}`}>
                      <RadioGroupItem value="pay_on_delivery" id="pay_on_delivery" />
                      <label htmlFor="pay_on_delivery" className="flex items-center gap-3 cursor-pointer flex-1">
                        <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center">
                          <Truck className="h-6 w-6 text-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">Pay on Delivery</p>
                          <p className="text-sm text-muted-foreground">
                            Pay with cash or M-Pesa when your order arrives
                          </p>
                        </div>
                      </label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-32">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary/30 shrink-0">
                        <img
                          src={item.product.image_url || '/placeholder.svg'}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-sm font-medium">
                        {formatPrice(item.product.price * item.quantity)}
                      </p>
                    </div>
                  ))}

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{shippingFee === 0 ? 'Free' : formatPrice(shippingFee)}</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-primary">{formatPrice(total)}</span>
                  </div>

                  <Button
                    type="submit"
                    className="w-full gradient-primary border-0"
                    disabled={loading || processingPayment}
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing Payment...
                      </>
                    ) : loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Order...
                      </>
                    ) : paymentMethod === 'pay_on_delivery' ? (
                      `Place Order - ${formatPrice(total)}`
                    ) : (
                      `Pay ${formatPrice(total)}`
                    )}
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    By placing this order, you agree to our Terms of Service
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default Checkout;
