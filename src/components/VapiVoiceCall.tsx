import { useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface VapiVoiceCallProps {
  businessName: string;
}

const VapiVoiceCall = ({ businessName }: VapiVoiceCallProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleCall = () => {
    if (!phoneNumber.trim()) return;
    
    setIsLoading(true);
    
    // Mock call - just for UI demo
    setTimeout(() => {
      setIsLoading(false);
      alert(`Would call ${phoneNumber} for ${businessName} support`);
    }, 1500);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium">Talk to {businessName}</h3>
        <p className="text-sm text-gray-600">Enter your number to get a call</p>
      </div>
      
      <Input
        type="tel"
        placeholder="Your phone number"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        className="text-center"
      />
      
      <Button
        onClick={handleCall}
        disabled={isLoading || !phoneNumber}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {isLoading ? (
          <span>Calling...</span>
        ) : (
          <>
            <Phone className="h-4 w-4 mr-2" />
            Call Me
          </>
        )}
      </Button>
    </div>
  );
};

export default VapiVoiceCall; 