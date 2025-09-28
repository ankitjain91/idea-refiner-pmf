import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function EnterpriseHub() {
  const navigate = useNavigate();
  
  // Dashboard is disabled - no hooks are called to prevent API requests
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-4 bg-destructive/10 rounded-full">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold">Dashboard Disabled</h2>
          <p className="text-muted-foreground">
            The dashboard functionality has been temporarily disabled for maintenance and security updates.
          </p>
          <Button 
            onClick={() => navigate('/ideachat')}
            className="mt-4"
          >
            Go to Idea Chat
          </Button>
        </div>
      </Card>
    </div>
  );
}