import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-foreground text-background mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-xl">S</span>
              </div>
              <span className="font-display text-xl font-bold">SecureShop</span>
            </div>
            <p className="text-sm opacity-80 mb-4">
              Your trusted e-commerce destination for quality products with secure M-Pesa payments.
            </p>
            <div className="flex gap-4">
              <a href="#" className="opacity-60 hover:opacity-100 transition-opacity">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="opacity-60 hover:opacity-100 transition-opacity">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="opacity-60 hover:opacity-100 transition-opacity">
                <Instagram className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/products" className="opacity-80 hover:opacity-100 transition-opacity">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/categories" className="opacity-80 hover:opacity-100 transition-opacity">
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/about" className="opacity-80 hover:opacity-100 transition-opacity">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="opacity-80 hover:opacity-100 transition-opacity">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="font-semibold mb-4">Customer Service</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/faq" className="opacity-80 hover:opacity-100 transition-opacity">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="opacity-80 hover:opacity-100 transition-opacity">
                  Shipping Information
                </Link>
              </li>
              <li>
                <Link to="/returns" className="opacity-80 hover:opacity-100 transition-opacity">
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="opacity-80 hover:opacity-100 transition-opacity">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="opacity-80 hover:opacity-100 transition-opacity">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 opacity-60" />
                <span className="opacity-80">Nairobi, Kenya</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 opacity-60" />
                <span className="opacity-80">+254 700 000 000</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 opacity-60" />
                <span className="opacity-80">support@secureshop.co.ke</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-background/20 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm opacity-60">
            © {new Date().getFullYear()} SecureShop. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <img
              src="https://www.safaricom.co.ke/images/icons/mpesa-logo.png"
              alt="M-Pesa"
              className="h-8 opacity-80"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
