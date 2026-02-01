import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, User, Menu, X, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { itemCount } = useCart();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 glass">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-xl">S</span>
            </div>
            <span className="font-display text-xl font-bold text-foreground hidden sm:block">
              SecureShop
            </span>
          </Link>

          {/* Search Bar - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50 focus:bg-card"
              />
            </div>
          </form>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Cart */}
            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs gradient-primary border-0">
                    {itemCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="cursor-pointer">
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="cursor-pointer">
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/signup" className="hidden sm:block">
                  <Button size="sm" className="gradient-primary border-0">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 animate-fade-in">
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>
            <nav className="flex flex-col gap-2">
              <Link
                to="/products"
                className="px-4 py-2 hover:bg-secondary rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                All Products
              </Link>
              <Link
                to="/categories"
                className="px-4 py-2 hover:bg-secondary rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                Categories
              </Link>
            </nav>
          </div>
        )}
      </div>

      {/* Navigation Bar */}
      <nav className="hidden md:block border-t border-border/50 bg-card/50">
        <div className="container mx-auto px-4">
          <ul className="flex items-center gap-8 h-12">
            <li>
              <Link
                to="/products"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                All Products
              </Link>
            </li>
            <li>
              <Link
                to="/products?category=electronics"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Electronics
              </Link>
            </li>
            <li>
              <Link
                to="/products?category=fashion"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Fashion
              </Link>
            </li>
            <li>
              <Link
                to="/products?category=home-garden"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Home & Garden
              </Link>
            </li>
            <li>
              <Link
                to="/products?category=beauty-health"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Beauty & Health
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
};

export default Header;
