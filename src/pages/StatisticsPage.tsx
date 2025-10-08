import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Home, Vote, MapPin, PieChart, Users as UsersIcon, GraduationCap, Baby, Briefcase, Map, Heart, TreePine } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StatisticsData {
  totalResidents: number;
  totalHouseholds: number;
  registeredVoters: number;
  totalPuroks: number;
  genderDistribution: { male: number; female: number; others: number };
  ageDistribution: { [key: string]: number };
  purokDistribution: { [key: string]: number };
  voterPercentage: number;
  avgHouseholdSize: number;
}

const StatisticsPage = () => {
  // Fetch statistics data
  const { data: statistics, isLoading, error } = useQuery({
    queryKey: ['barangay-statistics'],
    queryFn: async (): Promise<StatisticsData> => {
      try {
        // Fetch residents
        const { data: residents, error: residentsError } = await supabase
          .from('residents')
          .select('gender, birthdate, purok, is_voter');

        if (residentsError) throw residentsError;

        // Fetch households
        const { data: households, error: householdsError } = await supabase
          .from('households')
          .select('id, purok');

        if (householdsError) throw householdsError;

        // Calculate statistics
        const totalResidents = residents?.length || 0;
        const totalHouseholds = households?.length || 0;
        const registeredVoters = residents?.filter(r => r.is_voter).length || 0;
        
        // Gender distribution
        const maleCount = residents?.filter(r => r.gender === 'Male').length || 0;
        const femaleCount = residents?.filter(r => r.gender === 'Female').length || 0;
        const othersCount = residents?.filter(r => r.gender && r.gender !== 'Male' && r.gender !== 'Female').length || 0;

        // Age distribution
        const ageGroups = {
          '0-12 (Child)': 0,
          '13-17 (Teen)': 0,
          '18-29 (Young Adult)': 0,
          '30-59 (Adult)': 0,
          '60+ (Senior Citizen)': 0
        };

        residents?.forEach(resident => {
          if (resident.birthdate) {
            const age = new Date().getFullYear() - new Date(resident.birthdate).getFullYear();
            if (age >= 0 && age <= 12) ageGroups['0-12 (Child)']++;
            else if (age >= 13 && age <= 17) ageGroups['13-17 (Teen)']++;
            else if (age >= 18 && age <= 29) ageGroups['18-29 (Young Adult)']++;
            else if (age >= 30 && age <= 59) ageGroups['30-59 (Adult)']++;
            else if (age >= 60) ageGroups['60+ (Senior Citizen)']++;
          }
        });

        // Purok distribution
        const purokCounts: { [key: string]: number } = {};
        residents?.forEach(resident => {
          if (resident.purok) {
            purokCounts[resident.purok] = (purokCounts[resident.purok] || 0) + 1;
          }
        });

        const totalPuroks = Object.keys(purokCounts).length;
        const voterPercentage = totalResidents > 0 ? (registeredVoters / totalResidents) * 100 : 0;
        const avgHouseholdSize = totalHouseholds > 0 ? totalResidents / totalHouseholds : 0;

        return {
          totalResidents,
          totalHouseholds,
          registeredVoters,
          totalPuroks,
          genderDistribution: { male: maleCount, female: femaleCount, others: othersCount },
          ageDistribution: ageGroups,
          purokDistribution: purokCounts,
          voterPercentage,
          avgHouseholdSize
        };
      } catch (error) {
        console.error('Error fetching statistics:', error);
        throw error;
      }
    }
  });

  if (isLoading) {
    return <StatisticsSkeleton />;
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-background to-secondary/20 min-h-screen">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
          Error loading statistics. Please try again later.
        </div>
      </div>
    );
  }

  const malePercentage = statistics!.totalResidents > 0 ? (statistics!.genderDistribution.male / statistics!.totalResidents) * 100 : 0;
  const femalePercentage = statistics!.totalResidents > 0 ? (statistics!.genderDistribution.female / statistics!.totalResidents) * 100 : 0;
  const othersPercentage = statistics!.totalResidents > 0 ? (statistics!.genderDistribution.others / statistics!.totalResidents) * 100 : 0;

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-background to-secondary/20 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Barangay Statistics Dashboard</h1>
        <p className="text-lg text-muted-foreground">Comprehensive overview of resident demographics and community data</p>
      </div>

      {/* Key Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-blue-500 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Population</p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{statistics!.totalResidents.toLocaleString()}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Active residents</p>
            </div>
            <div className="bg-blue-200 dark:bg-blue-800 p-3 rounded-full">
              <Users className="text-blue-700 dark:text-blue-300 h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-green-500 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Total Households</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">{statistics!.totalHouseholds.toLocaleString()}</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">Avg {statistics!.avgHouseholdSize.toFixed(1)} per household</p>
            </div>
            <div className="bg-green-200 dark:bg-green-800 p-3 rounded-full">
              <Home className="text-green-700 dark:text-green-300 h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-orange-500 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Registered Voters</p>
              <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{statistics!.registeredVoters.toLocaleString()}</p>
              <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">{statistics!.voterPercentage.toFixed(1)}% of total population</p>
            </div>
            <div className="bg-orange-200 dark:bg-orange-800 p-3 rounded-full">
              <Vote className="text-orange-700 dark:text-orange-300 h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-l-4 border-purple-500 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Total Puroks</p>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{statistics!.totalPuroks}</p>
              <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">Administrative divisions</p>
            </div>
            <div className="bg-purple-200 dark:bg-purple-800 p-3 rounded-full">
              <MapPin className="text-purple-700 dark:text-purple-300 h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Gender and Household Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-card rounded-xl shadow-lg p-6 border border-border/50">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
            <PieChart className="text-primary mr-2 h-5 w-5" />
            Population by Gender
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
                <span className="text-foreground">Male</span>
              </div>
              <div className="flex items-center">
                <span className="text-lg font-semibold text-foreground mr-3">{statistics!.genderDistribution.male.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">{malePercentage.toFixed(1)}%</span>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{width: `${malePercentage}%`}}></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-pink-500 rounded mr-3"></div>
                <span className="text-foreground">Female</span>
              </div>
              <div className="flex items-center">
                <span className="text-lg font-semibold text-foreground mr-3">{statistics!.genderDistribution.female.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">{femalePercentage.toFixed(1)}%</span>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-pink-500 h-2 rounded-full" style={{width: `${femalePercentage}%`}}></div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-purple-500 rounded mr-3"></div>
                <span className="text-foreground">DaPon</span>
              </div>
              <div className="flex items-center">
                <span className="text-lg font-semibold text-foreground mr-3">{statistics!.genderDistribution.others.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">{othersPercentage.toFixed(1)}%</span>
              </div>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{width: `${othersPercentage}%`}}></div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-lg p-6 border border-border/50">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
            <UsersIcon className="text-green-600 mr-2 h-5 w-5" />
            Household Statistics
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-foreground">Average Household Size</span>
              <span className="text-lg font-semibold text-foreground">{statistics!.avgHouseholdSize.toFixed(1)} persons</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-foreground">Total Households</span>
              <span className="text-lg font-semibold text-foreground">{statistics!.totalHouseholds.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-foreground">Population Density</span>
              <span className="text-lg font-semibold text-foreground">
                {statistics!.totalPuroks > 0 
                  ? `${(statistics!.totalResidents / statistics!.totalPuroks).toFixed(0)} per purok`
                  : '0 per purok'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-foreground">Voter Registration Rate</span>
              <span className="text-lg font-semibold text-foreground">{statistics!.voterPercentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Age Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="bg-card rounded-xl shadow-lg p-6 border border-border/50">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
            <Baby className="text-orange-600 mr-2 h-5 w-5" />
            Age Distribution
          </h3>
          <div className="space-y-3">
            {Object.entries(statistics!.ageDistribution).map(([ageGroup, count], index) => {
              const percentage = statistics!.totalResidents > 0 ? (count / statistics!.totalResidents) * 100 : 0;
              const colors = ['bg-orange-600', 'bg-orange-500', 'bg-orange-700', 'bg-orange-800', 'bg-orange-900'];
              
              return (
                <div key={ageGroup}>
                   <div className="flex justify-between items-center">
                     <span className="text-sm text-muted-foreground">{ageGroup}</span>
                     <span className="text-sm font-medium text-foreground">{count.toLocaleString()} ({percentage.toFixed(1)}%)</span>
                   </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className={`${colors[index]} h-2 rounded-full`} style={{width: `${percentage}%`}}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-lg p-6 border border-border/50">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
            <Briefcase className="text-purple-600 mr-2 h-5 w-5" />
            Employment Overview
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Working Age (18-59)</span>
              <span className="text-sm font-medium text-foreground">
                {((statistics!.ageDistribution['18-29 (Young Adult)'] || 0) + (statistics!.ageDistribution['30-59 (Adult)'] || 0)).toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-purple-500 h-2 rounded-full" style={{width: `${statistics!.totalResidents > 0 ? ((((statistics!.ageDistribution['18-29 (Young Adult)'] || 0) + (statistics!.ageDistribution['30-59 (Adult)'] || 0)) / statistics!.totalResidents) * 100) : 0}%`}}></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Youth (18-29)</span>
              <span className="text-sm font-medium text-foreground">{(statistics!.ageDistribution['18-29 (Young Adult)'] || 0).toLocaleString()}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{width: `${statistics!.totalResidents > 0 ? (((statistics!.ageDistribution['18-29 (Young Adult)'] || 0) / statistics!.totalResidents) * 100) : 0}%`}}></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Senior Citizens (60+)</span>
              <span className="text-sm font-medium text-foreground">{(statistics!.ageDistribution['60+ (Senior Citizen)'] || 0).toLocaleString()}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{width: `${statistics!.totalResidents > 0 ? (((statistics!.ageDistribution['60+ (Senior Citizen)'] || 0) / statistics!.totalResidents) * 100) : 0}%`}}></div>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-lg p-6 border border-border/50">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
            <GraduationCap className="text-blue-600 mr-2 h-5 w-5" />
            Demographics Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Children (0-12)</span>
              <span className="text-sm font-medium text-foreground">{(statistics!.ageDistribution['0-12 (Child)'] || 0).toLocaleString()}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-blue-400 h-2 rounded-full" style={{width: `${statistics!.totalResidents > 0 ? (((statistics!.ageDistribution['0-12 (Child)'] || 0) / statistics!.totalResidents) * 100) : 0}%`}}></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Adults (30-59)</span>
              <span className="text-sm font-medium text-foreground">{(statistics!.ageDistribution['30-59 (Adult)'] || 0).toLocaleString()}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{width: `${statistics!.totalResidents > 0 ? (((statistics!.ageDistribution['30-59 (Adult)'] || 0) / statistics!.totalResidents) * 100) : 0}%`}}></div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Dependency Ratio</span>
              <span className="text-sm font-medium text-foreground">
                {(() => {
                  const dependents = (statistics!.ageDistribution['0-12 (Child)'] || 0) + (statistics!.ageDistribution['60+ (Senior Citizen)'] || 0);
                  const workers = (statistics!.ageDistribution['18-29 (Young Adult)'] || 0) + (statistics!.ageDistribution['30-59 (Adult)'] || 0);
                  return workers > 0 ? ((dependents / workers) * 100).toFixed(1) : '0.0';
                })()}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-blue-700 h-2 rounded-full" style={{width: `${(() => {
                const dependents = (statistics!.ageDistribution['0-12 (Child)'] || 0) + (statistics!.ageDistribution['60+ (Senior Citizen)'] || 0);
                const workers = (statistics!.ageDistribution['18-29 (Young Adult)'] || 0) + (statistics!.ageDistribution['30-59 (Adult)'] || 0);
                const ratio = workers > 0 ? (dependents / workers) * 100 : 0;
                return Math.min(ratio, 100); // Cap at 100% for visual display
              })()}%`}}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Purok Distribution */}
      <div className="bg-card rounded-xl shadow-lg p-6 mb-8 border border-border/50">
        <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
          <Map className="text-indigo-600 mr-2 h-5 w-5" />
          Purok Distribution
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(statistics!.purokDistribution)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([purok, count], index) => {
              const colors = [
                { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-900 dark:text-indigo-100', accent: 'text-indigo-700 dark:text-indigo-300' },
                { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-900 dark:text-blue-100', accent: 'text-blue-700 dark:text-blue-300' },
                { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-900 dark:text-teal-100', accent: 'text-teal-700 dark:text-teal-300' },
                { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-900 dark:text-green-100', accent: 'text-green-700 dark:text-green-300' },
                { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-900 dark:text-yellow-100', accent: 'text-yellow-700 dark:text-yellow-300' },
                { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-900 dark:text-orange-100', accent: 'text-orange-700 dark:text-orange-300' },
                { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-900 dark:text-red-100', accent: 'text-red-700 dark:text-red-300' },
                { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-900 dark:text-pink-100', accent: 'text-pink-700 dark:text-pink-300' },
                { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-900 dark:text-purple-100', accent: 'text-purple-700 dark:text-purple-300' },
                { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-900 dark:text-cyan-100', accent: 'text-cyan-700 dark:text-cyan-300' },
                { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-900 dark:text-emerald-100', accent: 'text-emerald-700 dark:text-emerald-300' },
                { bg: 'bg-lime-100 dark:bg-lime-900/30', text: 'text-lime-900 dark:text-lime-100', accent: 'text-lime-700 dark:text-lime-300' },
                { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-900 dark:text-amber-100', accent: 'text-amber-700 dark:text-amber-300' },
                { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-900 dark:text-violet-100', accent: 'text-violet-700 dark:text-violet-300' },
                { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-900 dark:text-rose-100', accent: 'text-rose-700 dark:text-rose-300' }
              ];
              const colorIndex = index % colors.length;
              const colorScheme = colors[colorIndex];
              
              return (
                <div key={purok} className={`${colorScheme.bg} p-4 rounded-lg hover:shadow-md transition-shadow duration-200 border border-border/20`}>
                  <h4 className={`font-semibold ${colorScheme.text}`}>{purok}</h4>
                  <p className={`text-2xl font-bold ${colorScheme.text}`}>{count.toLocaleString()}</p>
                  <p className={`text-sm ${colorScheme.accent}`}>residents</p>
                </div>
              );
            })}
        </div>
      </div>

      {/* Additional Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card rounded-xl shadow-lg p-6 border border-border/50">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
            <Heart className="text-red-600 mr-2 h-5 w-5" />
            Residents Overview
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-foreground">Registered Voters</span>
              <span className="text-lg font-semibold text-green-600">{statistics!.registeredVoters.toLocaleString()} ({statistics!.voterPercentage.toFixed(1)}%)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-foreground">Working Age Population</span>
              <span className="text-lg font-semibold text-blue-600">
                {((statistics!.ageDistribution['18-29 (Young Adult)'] || 0) + (statistics!.ageDistribution['30-59 (Adult)'] || 0)).toLocaleString()} 
                ({statistics!.totalResidents > 0 
                  ? ((((statistics!.ageDistribution['18-29 (Young Adult)'] || 0) + (statistics!.ageDistribution['30-59 (Adult)'] || 0)) / statistics!.totalResidents) * 100).toFixed(1) 
                  : '0.0'}%)
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-foreground">Youth Population</span>
              <span className="text-lg font-semibold text-pink-600">
                {(statistics!.ageDistribution['18-29 (Young Adult)'] || 0).toLocaleString()} 
                ({statistics!.totalResidents > 0 
                  ? (((statistics!.ageDistribution['18-29 (Young Adult)'] || 0) / statistics!.totalResidents) * 100).toFixed(1) 
                  : '0.0'}%)
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-foreground">Senior Citizens</span>
              <span className="text-lg font-semibold text-orange-600">{(statistics!.ageDistribution['60+ (Senior Citizen)'] || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-lg p-6 border border-border/50">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center">
            <TreePine className="text-green-600 mr-2 h-5 w-5" />
            Community Overview
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-foreground">Active Puroks</span>
              <span className="text-lg font-semibold text-indigo-600">{statistics!.totalPuroks}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-foreground">Average per Purok</span>
              <span className="text-lg font-semibold text-blue-600">
                {statistics!.totalPuroks > 0 
                  ? `${(statistics!.totalResidents / statistics!.totalPuroks).toFixed(0)} residents`
                  : '0 residents'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-foreground">Youth Population (15-29)</span>
              <span className="text-lg font-semibold text-green-600">{(statistics!.ageDistribution['18-29 (Young Adult)'] || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-foreground">Children (0-14)</span>
              <span className="text-lg font-semibold text-purple-600">{(statistics!.ageDistribution['0-12 (Child)'] || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatisticsSkeleton = () => {
  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-background to-secondary/20 min-h-screen">
      <div className="mb-8">
        <Skeleton className="h-10 w-96 mb-2" />
        <Skeleton className="h-6 w-80" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card rounded-xl shadow-lg p-6">
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[1, 2].map((i) => (
          <div key={i} className="bg-card rounded-xl shadow-lg p-6">
            <Skeleton className="h-40 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatisticsPage;
