
import { motion } from "framer-motion";
import { Star, MapPin, User, Phone, ImageIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import VapiVoiceCall from "./VapiVoiceCall";
import VeoFlyerGenerator from "./VeoFlyerGenerator";

interface BusinessCardProps {
  name: string;
  category: string;
  rating: number;
  image: string;
  description: string;
  owner: string;
  country: string;
  badges: string[];
}

const BusinessCard = ({ name, category, rating, image, description, owner, country, badges }: BusinessCardProps) => {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <Card className="h-full bg-white/80 backdrop-blur-sm border-orange-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
        <div className="relative">
          <div className="h-48 bg-gradient-to-br from-orange-200 to-teal-200 flex items-center justify-center">
            <div className="text-6xl">🍽️</div>
          </div>
          <div className="absolute top-4 right-4">
            <Badge className="bg-white/90 text-gray-700 hover:bg-white">
              {category}
            </Badge>
          </div>
        </div>
        
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl text-gray-800 mb-1">{name}</CardTitle>
              <div className="flex items-center space-x-1 mb-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium text-gray-700">{rating}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <User className="h-4 w-4" />
            <span>{owner}</span>
            <span>•</span>
            <span className="flex items-center">
              <span className="mr-1">🇪🇹</span>
              {country}
            </span>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <CardDescription className="text-gray-600 mb-4 line-clamp-2">
            {description}
          </CardDescription>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {badges.map((badge, index) => (
              <Badge key={index} variant="outline" className="text-xs border-teal-200 text-teal-700">
                {badge}
              </Badge>
            ))}
          </div>
          
          <div className="flex space-x-2 mb-4">
            <Button size="sm" className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700">
              Visit
            </Button>
            <Button size="sm" variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-50">
              Save
            </Button>
          </div>

          {/* AI Features */}
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1 border-green-300 text-green-700 hover:bg-green-50">
                  <Phone className="h-4 w-4 mr-1" />
                  Talk Now
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <VapiVoiceCall businessName={name} />
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1 border-purple-300 text-purple-700 hover:bg-purple-50">
                  <ImageIcon className="h-4 w-4 mr-1" />
                  Flyer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <VeoFlyerGenerator 
                  businessData={{
                    name,
                    category,
                    country
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default BusinessCard;
