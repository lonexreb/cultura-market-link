
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface CommunityEventProps {
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  attendees: number;
  maxAttendees: number;
}

const CommunityEvent = ({ title, date, time, location, description, attendees, maxAttendees }: CommunityEventProps) => {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  const attendancePercentage = (attendees / maxAttendees) * 100;

  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      <Card className="bg-white/80 backdrop-blur-sm border-teal-100 hover:shadow-lg transition-all duration-300">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl text-gray-800 mb-2">{title}</CardTitle>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4 text-teal-600" />
                  <span>{date}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Clock className="h-4 w-4 text-teal-600" />
                  <span>{time}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 text-teal-600" />
                  <span>{location}</span>
                </div>
              </div>
            </div>
            <div className="text-3xl">☕</div>
          </div>
        </CardHeader>
        
        <CardContent>
          <CardDescription className="text-gray-600 mb-4">
            {description}
          </CardDescription>
          
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>{attendees} / {maxAttendees} attending</span>
              </div>
              <span className="text-sm text-gray-500">{Math.round(attendancePercentage)}% full</span>
            </div>
            <Progress value={attendancePercentage} className="h-2" />
          </div>
          
          <div className="flex space-x-3">
            <Button className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700">
              Join Event
            </Button>
            <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50">
              Share
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CommunityEvent;
