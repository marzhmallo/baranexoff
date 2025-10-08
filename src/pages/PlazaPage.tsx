import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, Users, TrendingUp, FileCheck, LogOut, Search, Filter, Download, Eye, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GlobalLoadingScreen from '@/components/ui/GlobalLoadingScreen';
import { useLogoutWithLoader } from '@/hooks/useLogoutWithLoader';

const PlazaPage = () => {
  const navigate = useNavigate();

  const { isLoggingOut, handleLogout } = useLogoutWithLoader();

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Municipal Dashboard</h1>
            <p className="text-muted-foreground">Overview of all barangays within your jurisdiction</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Profiles</span>
            </Button>
            <Button 
              onClick={handleLogout}
              variant="destructive" 
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </Button>
          </div>
          {isLoggingOut && <GlobalLoadingScreen message="Logging out..." />}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Registered Barangays</h3>
                  <p className="text-2xl font-bold text-primary">42</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <Building2 className="text-primary h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-green-500 text-sm font-medium">+2 new</span>
                <span className="text-muted-foreground text-sm ml-1">this month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Population</h3>
                  <p className="text-2xl font-bold text-primary">186,452</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Users className="text-blue-600 h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-green-500 text-sm font-medium">+1.2%</span>
                <span className="text-muted-foreground text-sm ml-1">vs last quarter</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Households</h3>
                  <p className="text-2xl font-bold text-primary">48,127</p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <MapPin className="text-green-600 h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-green-500 text-sm font-medium">+0.8%</span>
                <span className="text-muted-foreground text-sm ml-1">vs last quarter</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Documents Processed</h3>
                  <p className="text-2xl font-bold text-primary">3,642</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <FileCheck className="text-purple-600 h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-green-500 text-sm font-medium">+14.3%</span>
                <span className="text-muted-foreground text-sm ml-1">this month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barangay Data Submissions Table */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold">Barangay Data Submissions</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Official reports submitted by barangays</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <input 
                    type="text" 
                    placeholder="Search submissions..." 
                    className="pl-10 pr-4 py-2 border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
                  />
                </div>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>Filters</span>
                </Button>
                <Button className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export All
                </Button>
              </div>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Barangay</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Report Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Submission Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Population</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Households</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                <tr className="hover:bg-muted/50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-medium">SJ</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">Brgy. San Jose</div>
                        <div className="text-sm text-muted-foreground">Zone 1</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">Q3 Resident & Household Report</div>
                    <div className="text-sm text-muted-foreground">July - September 2024</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">Oct 15, 2024</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Approved
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">4,521</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">1,187</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-muted/50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-medium">SL</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">Brgy. San Luis</div>
                        <div className="text-sm text-muted-foreground">Zone 2</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">Monthly Document Summary</div>
                    <div className="text-sm text-muted-foreground">October 2024</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">Oct 12, 2024</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      Under Review
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">3,892</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">1,024</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-muted/50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-green-600 font-medium">SM</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">Brgy. San Miguel</div>
                        <div className="text-sm text-muted-foreground">Zone 3</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">Q3 Resident & Household Report</div>
                    <div className="text-sm text-muted-foreground">July - September 2024</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">Oct 08, 2024</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Approved
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">2,156</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">612</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-muted/50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-purple-600 font-medium">SA</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">Brgy. San Antonio</div>
                        <div className="text-sm text-muted-foreground">Zone 4</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">Business Permit Summary</div>
                    <div className="text-sm text-muted-foreground">Q3 2024</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">Oct 05, 2024</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="destructive" className="bg-red-100 text-red-800">
                      Needs Revision
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">5,847</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">1,532</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>

                <tr className="hover:bg-muted/50 transition-colors duration-150">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                          <span className="text-orange-600 font-medium">SP</span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">Brgy. San Pedro</div>
                        <div className="text-sm text-muted-foreground">Zone 5</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-foreground">Monthly Document Summary</div>
                    <div className="text-sm text-muted-foreground">October 2024</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">Oct 18, 2024</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Approved
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">3,245</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">892</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing 1 to 5 of 42 submissions
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button size="sm">
                  1
                </Button>
                <Button variant="outline" size="sm">
                  2
                </Button>
                <Button variant="outline" size="sm">
                  3
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PlazaPage;