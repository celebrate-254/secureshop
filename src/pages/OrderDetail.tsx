import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Package, MapPin, Phone, ChevronLeft, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  total_price: number;
  product_id: string;
}

interface Address {
  full_name: string;
  phone_number: string;
  address_line1: string;
  city: string;
  county: string;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  shipping_fee: number;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  mpesa_receipt_number: string | null;
  created_at: string;
  shipping_address_id: string | null;
}

const OrderDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const paymentPending = searchParams.get('payment') === 'pending';

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id || !user) return;

      const [orderRes, itemsRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*')
          .eq('id', id)
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('order_items')
          .select('*')
          .eq('order_id', id),
      ]);

      if (orderRes.data) {
        setOrder(orderRes.data);

        if (orderRes.data.shipping_address_id) {
          const { data: addressData } = await supabase
            .from('addresses')
            .select('full_name, phone_number, address_line1, city, county')
            .eq('id', orderRes.data.shipping_address_id)
            .single();
          
          if (addressData) setAddress(addressData);
        }
      }

      if (itemsRes.data) setItems(itemsRes.data);
      setLoading(false);
    };

    fetchOrder();

    // Poll for payment status if pending
    if (paymentPending) {
      const interval = setInterval(fetchOrder, 5000);
      return () => clearInterval(interval);
    }
  }, [id, user, paymentPending]);

  const checkPaymentStatus = async () => {
    if (!order) return;

    setCheckingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('mpesa-query-status', {
        body: { orderId: order.id },
      });

      if (error) throw error;

      if (data?.paymentStatus === 'completed') {
        toast.success('Payment confirmed!');
        setOrder(prev => prev ? { ...prev, payment_status: 'completed', status: 'paid' } : null);
      } else if (data?.paymentStatus === 'failed') {
        toast.error('Payment failed. Please try again.');
      } else {
        toast.info('Payment still processing. Please check your phone.');
      }
    } catch (error) {
      toast.error('Failed to check payment status');
    } finally {
      setCheckingPayment(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-4">Order Not Found</h1>
          <Link to="/orders">
            <Button>View All Orders</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/orders"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Orders
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Order #{order.order_number}
            </h1>
            <p className="text-muted-foreground">{formatDate(order.created_at)}</p>
          </div>
          <Badge
            variant="secondary"
            className={`${
              order.payment_status === 'completed'
                ? 'bg-green-500'
                : order.payment_status === 'failed'
                ? 'bg-red-500'
                : 'bg-yellow-500'
            } text-white border-0`}
          >
            {order.payment_status === 'completed' ? (
              <><CheckCircle className="h-3 w-3 mr-1" /> Paid</>
            ) : order.payment_status === 'processing' ? (
              <><Clock className="h-3 w-3 mr-1" /> Processing</>
            ) : (
              <><Clock className="h-3 w-3 mr-1" /> Pending</>
            )}
          </Badge>
        </div>

        {/* Payment Pending Banner */}
        {order.payment_status === 'processing' && (
          <Card className="mb-6 border-yellow-500/50 bg-yellow-500/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium">Payment in progress</p>
                  <p className="text-sm text-muted-foreground">
                    Please complete the M-Pesa payment on your phone
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={checkPaymentStatus}
                disabled={checkingPayment}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${checkingPayment ? 'animate-spin' : ''}`} />
                Check Status
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Items */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatPrice(item.product_price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-medium">{formatPrice(item.total_price)}</p>
                  </div>
                ))}

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(order.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>
                      {order.shipping_fee === 0 ? 'Free' : formatPrice(order.shipping_fee)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-primary">
                      {formatPrice(order.total_amount)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Info */}
          <div className="space-y-6">
            {/* Shipping Address */}
            {address && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="h-4 w-4" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{address.full_name}</p>
                  <p className="text-sm text-muted-foreground">{address.address_line1}</p>
                  <p className="text-sm text-muted-foreground">
                    {address.city}, {address.county}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
                    <Phone className="h-3 w-3" />
                    {address.phone_number}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">M-Pesa</p>
                {order.mpesa_receipt_number && (
                  <p className="text-sm text-muted-foreground">
                    Receipt: {order.mpesa_receipt_number}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default OrderDetail;
