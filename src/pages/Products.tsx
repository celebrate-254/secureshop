import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Checkbox } from '@/components/ui/checkbox';
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
}

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  const searchQuery = searchParams.get('search') || '';
  const categoryFilter = searchParams.get('category') || '';

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('categories').select('id, name, slug');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      if (categoryFilter) {
        const categoryRes = await supabase
          .from('categories')
          .select('id')
          .eq('slug', categoryFilter)
          .single();
        
        if (categoryRes.data) {
          query = query.eq('category_id', categoryRes.data.id);
        }
      }

      switch (sortBy) {
        case 'price-asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price-desc':
          query = query.order('price', { ascending: false });
          break;
        case 'name':
          query = query.order('name', { ascending: true });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data } = await query;
      if (data) setProducts(data);
      setLoading(false);
    };

    fetchProducts();
  }, [searchQuery, categoryFilter, sortBy]);

  const handleCategoryChange = (slug: string, checked: boolean) => {
    if (checked) {
      setSearchParams({ ...Object.fromEntries(searchParams), category: slug });
    } else {
      const params = new URLSearchParams(searchParams);
      params.delete('category');
      setSearchParams(params);
    }
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            {categoryFilter
              ? categories.find(c => c.slug === categoryFilter)?.name || 'Products'
              : searchQuery
              ? `Search: "${searchQuery}"`
              : 'All Products'}
          </h1>
          <p className="text-muted-foreground">
            {products.length} products found
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Filters */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-32 space-y-6">
              <div>
                <h3 className="font-semibold mb-4">Categories</h3>
                <div className="space-y-3">
                  {categories.map((category) => (
                    <div key={category.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={category.slug}
                        checked={categoryFilter === category.slug}
                        onCheckedChange={(checked) =>
                          handleCategoryChange(category.slug, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={category.slug}
                        className="text-sm cursor-pointer"
                      >
                        {category.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {(categoryFilter || searchQuery) && (
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Clear Filters
                </Button>
              )}
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6 gap-4">
              {/* Mobile Filter Button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <div>
                      <h3 className="font-semibold mb-4">Categories</h3>
                      <div className="space-y-3">
                        {categories.map((category) => (
                          <div key={category.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`mobile-${category.slug}`}
                              checked={categoryFilter === category.slug}
                              onCheckedChange={(checked) =>
                                handleCategoryChange(category.slug, checked as boolean)
                              }
                            />
                            <label
                              htmlFor={`mobile-${category.slug}`}
                              className="text-sm cursor-pointer"
                            >
                              {category.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex-1" />

              {/* Sort */}
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Products Grid */}
            <ProductGrid products={products} loading={loading} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Products;
