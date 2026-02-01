import { useState } from 'react';
import { User, Mail, Phone, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const Profile = () => {
  const { user, profile, updateProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone_number: profile?.phone_number || '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await updateProfile(formData);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated successfully');
    }

    setLoading(false);
  };

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-4">Sign in to view profile</h1>
        </div>
      </Layout>
    );
  }

  const initials = profile?.full_name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || user.email?.[0].toUpperCase() || 'U';

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">My Profile</h1>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="gradient-primary text-primary-foreground text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{profile?.full_name || 'User'}</CardTitle>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="pl-10 bg-secondary/50"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="Your full name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="pl-10"
                    placeholder="0712345678"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="gradient-primary border-0"
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Profile;
