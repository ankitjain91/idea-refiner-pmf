import PMFAnalyzer from "@/components/PMFAnalyzer";
import { UserMenu } from "@/components/UserMenu";
import { useAuth } from "@/contexts/AuthContext";

const Index = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen">
      <div className="absolute top-4 right-4 z-50">
        <UserMenu />
      </div>
      <PMFAnalyzer />
    </div>
  );
};

export default Index;