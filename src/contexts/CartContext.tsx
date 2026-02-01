import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    stock_quantity: number;
  };
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  itemCount: number;
  subtotal: number;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCart = async () => {
    if (!user) {
      setItems([]);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        product_id,
        quantity,
        product:products (
          id,
          name,
          price,
          image_url,
          stock_quantity
        )
      `)
      .eq('user_id', user.id);

    if (!error && data) {
      setItems(data as unknown as CartItem[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCart();
  }, [user]);

  const addToCart = async (productId: string, quantity = 1) => {
    if (!user) {
      toast.error('Please sign in to add items to cart');
      return;
    }

    const existingItem = items.find(item => item.product_id === productId);

    if (existingItem) {
      await updateQuantity(productId, existingItem.quantity + quantity);
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({
          user_id: user.id,
          product_id: productId,
          quantity,
        });

      if (error) {
        toast.error('Failed to add item to cart');
      } else {
        toast.success('Added to cart!');
        fetchCart();
      }
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!user) return;

    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (!error) {
      fetchCart();
    }
  };

  const removeFromCart = async (productId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (!error) {
      toast.success('Item removed from cart');
      fetchCart();
    }
  };

  const clearCart = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id);

    if (!error) {
      setItems([]);
    }
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        itemCount,
        subtotal,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
