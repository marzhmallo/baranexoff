
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Users, User, UserRound, UsersRound, CalendarDays, FileText, ShieldCheck } from "lucide-react";

interface ResidentStatusCardProps {
  label: string;
  count: number;
  bgColor: string;
  textColor: string;
  iconBgColor: string;
  iconColor: string;
  onClick?: () => void;
  isActive?: boolean;
}

const ResidentStatusCard = ({
  label,
  count,
  bgColor,
  textColor,
  iconBgColor,
  iconColor,
  onClick,
  isActive = false
}: ResidentStatusCardProps) => {
  // Determine which icon to use based on the label
  const renderIcon = () => {
    switch (label) {
      case 'Student':
        return <UserRound className="h-5 w-5" />;
      case 'Senior Citizen':
        return <User className="h-5 w-5" />;
      case 'PWD':
        return <ShieldCheck className="h-5 w-5" />;
      case 'Solo Parent':
        return <UsersRound className="h-5 w-5" />;
      case 'Indigent':
        return <User className="h-5 w-5" />;
      case '4Ps':
        return <Users className="h-5 w-5" />;
      default:
        return <Users className="h-5 w-5" />;
    }
  };

  return (
    <Card 
      className={`${bgColor} border-transparent cursor-pointer transition-transform hover:scale-105 ${
        isActive ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4 flex justify-between items-center">
        <div>
          <p className={`text-sm font-medium ${textColor}`}>{label}</p>
          <p className={`text-2xl font-bold ${textColor}`}>{count}</p>
        </div>
        <div className={`h-10 w-10 rounded-full ${iconBgColor} flex items-center justify-center`}>
          {renderIcon()}
        </div>
      </CardContent>
    </Card>
  );
};

export default ResidentStatusCard;
