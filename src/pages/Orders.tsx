import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice, formatDate } from '@/lib/utils';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  payment_status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-500' },
  processing: { label: 'Processing', icon: Package, color: 'bg-blue-500' },
  paid: { label: 'Paid', icon: CheckCircle, color: 'bg-green-500' },
  shipped: { label: 'Shipped', icon: Truck, color: 'bg-purple-500' },
  delivered: { label: 'Delivered', icon: CheckCircle, color: 'bg-green-600' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-500' },
};

const Orders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (data) setOrders(data);
      setLoading(false);
    };

    fetchOrders();
  }, [user]);

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-4">Sign in to view orders</h1>
          <Link to="/login">
            <Badge className="gradient-primary border-0 cursor-pointer">Sign In</Badge>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">My Orders</h1>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-8">
              Start shopping to see your orders here.
            </p>
            <Link to="/products">
              <Badge className="gradient-primary border-0 px-4 py-2 cursor-pointer">
                Start Shopping
              </Badge>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;

              return (
                <Link key={order.id} to={`/orders/${order.id}`}>
                  <Card className="card-hover">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">
                            Order #{order.order_number}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(order.created_at)}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <Badge
                            variant="secondary"
                            className={`${status.color} text-white border-0`}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                          <span className="font-bold text-primary">
                            {formatPrice(order.total_amount)}
                          </span>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Orders;
