import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Lightbulb, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

interface IdeaInputProps {
  value: string;
  onChange: (value: string) => void;
}

const IdeaInput = ({ value, onChange }: IdeaInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    setCharCount(value.length);
  }, [value]);

  const suggestions = [
    "Add your target audience",
    "Include the problem you're solving",
    "Mention your unique value proposition",
    "Describe the revenue model",
  ];

  const activeSuggestions = suggestions.filter((_, index) => {
    if (charCount < 20) return index === 0;
    if (charCount < 50) return index <= 1;
    if (charCount < 100) return index <= 2;
    return true;
  });

  return (
    <Card className={cn(
      "glass-card p-6 transition-all duration-300",
      isFocused && "ring-2 ring-primary shadow-[var(--shadow-glow)]"
    )}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-display font-semibold">Your Startup Idea</h2>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI-Enhanced
          </Badge>
        </div>

        <div className="relative">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Describe your startup idea... What problem does it solve? Who is your target audience?"
            className="min-h-[120px] resize-none bg-background/50 border-border/50 placeholder:text-muted-foreground/50 focus:border-primary transition-colors"
          />
          
          {value && (
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{charCount} characters</span>
              {charCount > 100 && <Rocket className="w-4 h-4 text-success animate-pulse" />}
            </div>
          )}
        </div>

        {/* Auto-refinement suggestions */}
        {activeSuggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Suggestions to improve your pitch:</p>
            <div className="flex flex-wrap gap-2">
              {activeSuggestions.map((suggestion, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className={cn(
                    "text-xs cursor-pointer transition-all hover:bg-primary/10 hover:border-primary",
                    "animate-slide-up"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => {
                    if (value) {
                      onChange(value + " " + suggestion);
                    } else {
                      onChange(suggestion);
                    }
                  }}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default IdeaInput;