import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GenerateButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

const GenerateButton = ({ onClick, disabled }: GenerateButtonProps) => {
  return (
    <Button
      size="lg"
      onClick={onClick}
      disabled={disabled}
      className="gap-2"
    >
      <Sparkles className="w-4 h-4" />
      Generate Content
    </Button>
  );
};

export default GenerateButton;
