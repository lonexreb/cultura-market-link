
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CulturalConnectionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: "orange" | "teal";
}

const CulturalConnection = ({ title, description, icon: Icon, color }: CulturalConnectionProps) => {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const colorClasses = {
    orange: {
      bg: "from-orange-500 to-orange-600",
      icon: "text-orange-600",
      hover: "hover:shadow-orange-200"
    },
    teal: {
      bg: "from-teal-500 to-teal-600",
      icon: "text-teal-600",
      hover: "hover:shadow-teal-200"
    }
  };

  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
    >
      <Card className={`bg-white/80 backdrop-blur-sm border-gray-100 hover:shadow-xl ${colorClasses[color].hover} transition-all duration-300 h-full`}>
        <CardHeader className="text-center pb-4">
          <div className={`bg-gradient-to-br ${colorClasses[color].bg} p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center`}>
            <Icon className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-xl text-gray-800">{title}</CardTitle>
        </CardHeader>
        
        <CardContent className="text-center">
          <CardDescription className="text-gray-600 leading-relaxed">
            {description}
          </CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CulturalConnection;
