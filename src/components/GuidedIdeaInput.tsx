import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Target, Users, DollarSign, ArrowRight, Sparkles, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Validation schema
const ideaSchema = z.object({
  problem: z.string().trim().min(10, "Problem must be at least 10 characters").max(200, "Problem must be less than 200 characters"),
  solution: z.string().trim().min(10, "Solution must be at least 10 characters").max(200, "Solution must be less than 200 characters"),
  targetUsers: z.string().min(1, "Please select target users"),
  uniqueness: z.string().trim().min(10, "Uniqueness must be at least 10 characters").max(150, "Uniqueness must be less than 150 characters"),
  tags: z.array(z.string()).min(1, "Add at least one tag").max(5, "Maximum 5 tags allowed")
});

interface GuidedIdeaInputProps {
  onSubmit: (idea: string, metadata: any) => void;
  value?: string;
}

export default function GuidedIdeaInput({ onSubmit, value }: GuidedIdeaInputProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    problem: "",
    solution: "",
    targetUsers: "",
    uniqueness: "",
    tags: [] as string[],
    currentTag: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const targetUserOptions = [
    { value: "consumers", label: "Everyday Consumers", icon: "🛍️" },
    { value: "businesses", label: "Small Businesses", icon: "🏪" },
    { value: "enterprise", label: "Enterprise", icon: "🏢" },
    { value: "creators", label: "Content Creators", icon: "🎨" },
    { value: "developers", label: "Developers", icon: "💻" },
    { value: "students", label: "Students", icon: "📚" }
  ];

  const suggestedTags = [
    "AI/ML", "SaaS", "Marketplace", "FinTech", "EdTech", 
    "HealthTech", "B2B", "B2C", "Mobile", "Web3"
  ];

  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    try {
      switch(stepNumber) {
        case 1:
          ideaSchema.shape.problem.parse(formData.problem);
          break;
        case 2:
          ideaSchema.shape.solution.parse(formData.solution);
          break;
        case 3:
          ideaSchema.shape.targetUsers.parse(formData.targetUsers);
          break;
        case 4:
          ideaSchema.shape.uniqueness.parse(formData.uniqueness);
          break;
        case 5:
          ideaSchema.shape.tags.parse(formData.tags);
          break;
      }
      setErrors(newErrors);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        error.errors.forEach((err) => {
          newErrors[err.path[0]] = err.message;
        });
      }
      setErrors(newErrors);
      return false;
    }
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step < 5) {
        setStep(step + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleAddTag = (tag: string) => {
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
      setFormData({ ...formData, tags: [...formData.tags, tag], currentTag: "" });
      setErrors({ ...errors, tags: "" });
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const handleSubmit = () => {
    try {
      ideaSchema.parse(formData);
      
      // Create formatted idea description
      const ideaDescription = `${formData.solution} to solve "${formData.problem}" for ${formData.targetUsers}. What makes it unique: ${formData.uniqueness}`;
      
      // Metadata for additional processing
      const metadata = {
        problem: formData.problem,
        solution: formData.solution,
        targetUsers: formData.targetUsers,
        uniqueness: formData.uniqueness,
        tags: formData.tags
      };
      
      onSubmit(ideaDescription, metadata);
      
      toast({
        title: "Idea Captured!",
        description: "Your startup idea is being analyzed...",
      });
      
      // Reset form
      setFormData({
        problem: "",
        solution: "",
        targetUsers: "",
        uniqueness: "",
        tags: [],
        currentTag: ""
      });
      setStep(1);
    } catch (error) {
      toast({
        title: "Validation Error",
        description: "Please complete all required fields",
        variant: "destructive"
      });
    }
  };

  const getStepContent = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-primary" />
              <Label className="text-base font-medium">What problem are you solving?</Label>
            </div>
            <Textarea
              value={formData.problem}
              onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
              placeholder="e.g., Small businesses struggle to manage inventory efficiently..."
              className="min-h-[100px] resize-none"
              maxLength={200}
            />
            {errors.problem && (
              <p className="text-sm text-destructive">{errors.problem}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.problem.length}/200 characters
            </p>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              <Label className="text-base font-medium">How will you solve it?</Label>
            </div>
            <Textarea
              value={formData.solution}
              onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
              placeholder="e.g., An AI-powered inventory management app that predicts demand..."
              className="min-h-[100px] resize-none"
              maxLength={200}
            />
            {errors.solution && (
              <p className="text-sm text-destructive">{errors.solution}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.solution.length}/200 characters
            </p>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-primary" />
              <Label className="text-base font-medium">Who are your target users?</Label>
            </div>
            <RadioGroup
              value={formData.targetUsers}
              onValueChange={(value) => setFormData({ ...formData, targetUsers: value })}
            >
              <div className="grid grid-cols-2 gap-3">
                {targetUserOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label 
                      htmlFor={option.value} 
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
            {errors.targetUsers && (
              <p className="text-sm text-destructive">{errors.targetUsers}</p>
            )}
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <Label className="text-base font-medium">What makes it unique?</Label>
            </div>
            <Textarea
              value={formData.uniqueness}
              onChange={(e) => setFormData({ ...formData, uniqueness: e.target.value })}
              placeholder="e.g., Unlike competitors, we use predictive AI that learns from local market trends..."
              className="min-h-[100px] resize-none"
              maxLength={150}
            />
            {errors.uniqueness && (
              <p className="text-sm text-destructive">{errors.uniqueness}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {formData.uniqueness.length}/150 characters
            </p>
          </div>
        );
      
      case 5:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <Label className="text-base font-medium">Add relevant tags (max 5)</Label>
            </div>
            
            {/* Current tags */}
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => handleRemoveTag(tag)}
                  />
                </Badge>
              ))}
            </div>
            
            {/* Tag input */}
            <div className="flex gap-2">
              <Input
                value={formData.currentTag}
                onChange={(e) => setFormData({ ...formData, currentTag: e.target.value })}
                placeholder="Add custom tag..."
                maxLength={20}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(formData.currentTag);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleAddTag(formData.currentTag)}
                disabled={!formData.currentTag || formData.tags.length >= 5}
              >
                Add
              </Button>
            </div>
            
            {/* Suggested tags */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTags
                  .filter(tag => !formData.tags.includes(tag))
                  .map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="outline" 
                      className="cursor-pointer hover:bg-primary/10"
                      onClick={() => handleAddTag(tag)}
                    >
                      + {tag}
                    </Badge>
                  ))}
              </div>
            </div>
            
            {errors.tags && (
              <p className="text-sm text-destructive">{errors.tags}</p>
            )}
          </div>
        );
    }
  };

  const stepTitles = [
    "Problem", "Solution", "Target Users", "Uniqueness", "Tags"
  ];

  return (
    <Card className="border-border/50 bg-card/95 backdrop-blur-xl animate-slide-up">
      <CardHeader>
        <CardTitle>Describe Your Startup Idea</CardTitle>
        <CardDescription>
          Answer a few quick questions to help us analyze your idea
        </CardDescription>
        
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mt-4">
          {[1, 2, 3, 4, 5].map((num) => (
            <div
              key={num}
              className={`flex-1 h-2 rounded-full transition-all ${
                num <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Step {step} of 5: {stepTitles[step - 1]}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {getStepContent()}
        
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            className="flex items-center gap-2"
          >
            {step === 5 ? 'Analyze Idea' : 'Next'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}