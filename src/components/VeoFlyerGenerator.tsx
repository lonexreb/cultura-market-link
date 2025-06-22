import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BusinessData {
  name: string;
  category: string;
  country: string;
}

interface VeoFlyerGeneratorProps {
  businessData: BusinessData;
}

const VeoFlyerGenerator = ({ businessData }: VeoFlyerGeneratorProps) => {
  const [style, setStyle] = useState("modern");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    
    // Mock generation - just for UI demo
    setTimeout(() => {
      setIsGenerating(false);
      alert(`Would generate ${style} flyer for ${businessData.name}`);
    }, 2000);
  };

  const styles = [
    { value: "modern", label: "Modern" },
    { value: "traditional", label: "Traditional" },
    { value: "colorful", label: "Colorful" },
    { value: "elegant", label: "Elegant" }
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium">Create Flyer</h3>
        <p className="text-sm text-gray-600">Generate a flyer for {businessData.name}</p>
      </div>
      
      <div>
        <label className="text-sm font-medium mb-2 block">Style</label>
        <Select value={style} onValueChange={setStyle}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {styles.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-gray-50 p-3 rounded text-sm">
        <div>🏪 {businessData.name}</div>
        <div>🌍 {businessData.country} • {businessData.category}</div>
      </div>
      
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {isGenerating ? (
          <span>Generating...</span>
        ) : (
          <>
            <ImageIcon className="h-4 w-4 mr-2" />
            Generate Flyer
          </>
        )}
      </Button>
    </div>
  );
};

export default VeoFlyerGenerator; 