import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/EnhancedAuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, CreditCard, Bell, Shield, Globe, Building, MapPin, Link, Twitter, Linkedin, Phone, Mail, Calendar, Check, X, Crown, ExternalLink } from "lucide-react";
import { format } from "date-fns";

interface ProfileData {
  full_name: string;
  bio: string;
  avatar_url: string;
  company: string;
  role: string;
  website: string;
  linkedin_url: string;
  twitter_url: string;
  phone: string;
  location: string;
  timezone: string;
  email_notifications: boolean;
  marketing_emails: boolean;
}

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  const { subscription, checkSubscription } = useSubscription();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    full_name: "",
    bio: "",
    avatar_url: "",
    company: "",
    role: "",
    website: "",
    linkedin_url: "",
    twitter_url: "",
    phone: "",
    location: "",
    timezone: "UTC",
    email_notifications: true,
    marketing_emails: false,
  });
  
  const [managingSubscription, setManagingSubscription] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    } else if (user) {
      loadProfile();
    }
  }, [user, authLoading, navigate]);

  const loadProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          bio: data.bio || "",
          avatar_url: data.avatar_url || "",
          company: data.company || "",
          role: data.role || "",
          website: data.website || "",
          linkedin_url: data.linkedin_url || "",
          twitter_url: data.twitter_url || "",
          phone: data.phone || "",
          location: data.location || "",
          timezone: data.timezone || "UTC",
          email_notifications: data.email_notifications ?? true,
          marketing_emails: data.marketing_emails ?? false,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          ...profile,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    try {
      const response = await supabase.functions.invoke('customer-portal', {
        body: {},
      });

      if (response.error) throw response.error;
      if (response.data?.url) {
        window.open(response.data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: "Error",
        description: "Failed to open subscription management",
        variant: "destructive",
      });
    } finally {
      setManagingSubscription(false);
    }
  };

  const handleUpgrade = async () => {
    navigate('/pricing');
  };

  const getInitials = () => {
    if (profile.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'U';
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your profile and subscription</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Subscription</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information and public profile</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Label htmlFor="avatar_url">Avatar URL</Label>
                    <Input
                      id="avatar_url"
                      placeholder="https://example.com/avatar.jpg"
                      value={profile.avatar_url}
                      onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                      className="max-w-md"
                    />
                  </div>
                </div>

                <Separator />

                {/* Basic Information */}
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      placeholder="John Doe"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="company"
                        placeholder="Acme Inc."
                        value={profile.company}
                        onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      placeholder="Product Manager"
                      value={profile.role}
                      onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="location"
                        placeholder="San Francisco, CA"
                        value={profile.location}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="+1 (555) 123-4567"
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself..."
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    rows={4}
                  />
                </div>

                <Separator />

                {/* Social Links */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Social Links</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="website"
                          placeholder="https://example.com"
                          value={profile.website}
                          onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin_url">LinkedIn</Label>
                      <div className="relative">
                        <Linkedin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="linkedin_url"
                          placeholder="https://linkedin.com/in/username"
                          value={profile.linkedin_url}
                          onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitter_url">Twitter</Label>
                      <div className="relative">
                        <Twitter className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="twitter_url"
                          placeholder="https://twitter.com/username"
                          value={profile.twitter_url}
                          onChange={(e) => setProfile({ ...profile, twitter_url: e.target.value })}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="subscription" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Details</CardTitle>
                <CardDescription>Manage your subscription and billing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Plan */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Crown className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Current Plan</p>
                      <p className="text-sm text-muted-foreground">
                        {subscription.tier === 'free' ? 'Free Plan' : 
                         subscription.tier === 'pro' ? 'Pro Plan' : 
                         subscription.tier === 'enterprise' ? 'Enterprise Plan' : 
                         'Premium Plan'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={subscription.tier === 'free' ? 'secondary' : 'default'}>
                    {subscription.tier.toUpperCase()}
                  </Badge>
                </div>

                {/* Subscription Status */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Status</p>
                    <div className="flex items-center gap-2">
                      {subscription.subscribed ? (
                        <>
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Active</span>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 text-red-600" />
                          <span className="text-sm">Inactive</span>
                        </>
                      )}
                    </div>
                  </div>
                  {subscription.subscription_end && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Next Billing Date</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(subscription.subscription_end), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Features Included</h3>
                  <div className="grid gap-3">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Unlimited PM-Fit Analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Real-time Market Data</span>
                    </div>
                    {subscription.tier !== 'free' && (
                      <>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Advanced Analytics</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Priority Support</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Usage Statistics</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Analyses This Month</p>
                      <p className="text-2xl font-bold">12</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Sessions Created</p>
                      <p className="text-2xl font-bold">24</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">PM-Fit Score Avg</p>
                      <p className="text-2xl font-bold">76%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-4">
                {subscription.tier === 'free' ? (
                  <Button onClick={handleUpgrade} className="flex items-center gap-2">
                    <Crown className="h-4 w-4" />
                    Upgrade Plan
                  </Button>
                ) : (
                  <Button 
                    onClick={handleManageSubscription} 
                    disabled={managingSubscription}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    {managingSubscription ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-4 w-4" />
                        Manage Subscription
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={checkSubscription}
                  variant="outline"
                >
                  Refresh Status
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Manage how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications about your analyses and updates
                      </p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={profile.email_notifications}
                      onCheckedChange={(checked) => 
                        setProfile({ ...profile, email_notifications: checked })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="marketing-emails">Marketing Emails</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates about new features and promotions
                      </p>
                    </div>
                    <Switch
                      id="marketing-emails"
                      checked={profile.marketing_emails}
                      onCheckedChange={(checked) => 
                        setProfile({ ...profile, marketing_emails: checked })
                      }
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Preferences"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Your account is secured with email authentication. 
                    For additional security, consider enabling two-factor authentication.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Account Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">User ID</span>
                        <span className="font-mono">{user.id.slice(0, 8)}...</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Created</span>
                        <span>{user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Sign In</span>
                        <span>{user.last_sign_in_at ? format(new Date(user.last_sign_in_at), 'MMM d, yyyy') : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}