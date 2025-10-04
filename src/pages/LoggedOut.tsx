
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function LoggedOut() {
  return (
    <div className="min-h-screen grid place-items-center bg-[radial-gradient(1200px_400px_at_0%_0%,rgba(0,0,0,0.03),transparent)] p-4">
      <Card className="w-full max-w-md shadow-lg border-border/60" data-test="logged-out-card">
        <CardHeader>
          <h1 className="text-lg font-semibold tracking-tight mb-1">Signed out</h1>
          <CardTitle className="sr-only">Signed out</CardTitle>
          <p className="text-sm text-muted-foreground">You have successfully logged out.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm opacity-80">You're now logged out. See you soon!</p>
          <div className="flex gap-2">
            <Link to="/"><Button variant="ghost">Back to site</Button></Link>
            <Link to="/login"><Button>Sign in again</Button></Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
