
import { FileCheck, FileClock, FileWarning, Files } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DocumentsStats = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-card hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Documents
          </CardTitle>
          <Files className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(() => {
              const stats = localStorage.getItem('preloadedDocumentStats');
              return stats ? JSON.parse(stats).total : 0;
            })()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            All document requests
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-card hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Pending
          </CardTitle>
          <FileClock className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(() => {
              const stats = localStorage.getItem('preloadedProcessingStats');
              return stats ? JSON.parse(stats).pending : 0;
            })()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Documents awaiting review
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-card hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Approved Documents
          </CardTitle>
          <FileCheck className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(() => {
              const stats = localStorage.getItem('preloadedProcessingStats');
              return stats ? JSON.parse(stats).released : 0;
            })()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Documents released
          </p>
        </CardContent>
      </Card>
      
      <Card className="bg-card hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Rejected Documents
          </CardTitle>
          <FileWarning className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {(() => {
              const stats = localStorage.getItem('preloadedProcessingStats');
              return stats ? JSON.parse(stats).rejected : 0;
            })()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Documents rejected
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentsStats;
