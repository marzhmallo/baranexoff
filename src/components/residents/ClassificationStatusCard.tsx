
import React from 'react';
import { Users, User, UserRound, UsersRound, CalendarDays, FileText, ShieldCheck } from 'lucide-react';

interface ClassificationStatusCardProps {
  label: string;
  count: number;
  bgColor: string;
  textColor: string;
  iconBgColor: string;
  iconColor: string;
  onClick: () => void;
  isActive?: boolean;
}

const ClassificationStatusCard: React.FC<ClassificationStatusCardProps> = ({
  label,
  count,
  bgColor,
  textColor,
  iconBgColor,
  iconColor,
  onClick,
  isActive = false,
}) => {
  // Determine which icon to use based on the label
  const renderIcon = () => {
    switch (label) {
      case 'Student':
        return <UserRound className="h-6 w-6" />;
      case 'Senior Citizen':
        return <User className="h-6 w-6" />;
      case 'PWD':
        return <ShieldCheck className="h-6 w-6" />;
      case 'Solo Parent':
        return <UsersRound className="h-6 w-6" />;
      case 'Indigent':
        return <User className="h-6 w-6" />;
      case '4Ps':
        return <Users className="h-6 w-6" />;
      default:
        return <User className="h-6 w-6" />;
    }
  };

  return (
    <div
      className={`${bgColor} ${textColor} rounded-lg shadow-sm p-4 cursor-pointer transition-all hover:shadow-md ${
        isActive ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div className={`${iconBgColor} ${iconColor} p-2 rounded-md mr-3`}>
          {renderIcon()}
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold">{count}</p>
        </div>
      </div>
    </div>
  );
};

export default ClassificationStatusCard;
