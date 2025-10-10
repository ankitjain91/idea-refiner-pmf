import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Trophy, 
  TrendingUp, 
  Lightbulb, 
  Users, 
  Crown,
  Medal,
  Award,
  RefreshCw
} from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

interface LeaderboardEntry {
  username: string
  full_name: string
  avatar_url?: string
  total_ideas: number
  avg_pmf_score: number
  best_pmf_score: number
  total_referrals: number
  successful_referrals: number
}

export function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('leaderboard')
        .select('*')
        .limit(50)

      if (fetchError) throw fetchError

      setLeaderboard(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch leaderboard'
      setError(errorMessage)
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-orange-500" />
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>
    }
  }

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white'
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white'
      case 3:
        return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getInitials = (name: string, username: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return username.slice(0, 2).toUpperCase()
  }

  const topPerformers = leaderboard.slice(0, 10)
  const byIdeas = [...leaderboard].sort((a, b) => b.total_ideas - a.total_ideas).slice(0, 10)
  const byReferrals = [...leaderboard].sort((a, b) => b.successful_referrals - a.successful_referrals).slice(0, 10)

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="flex items-center justify-center min-h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Unable to load leaderboard</h3>
                <p className="text-muted-foreground">{error}</p>
              </div>
              <Button onClick={fetchLeaderboard}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">SmoothBrains Leaderboard</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Celebrating our top innovators and idea builders. Rankings are based on PMF scores, 
          idea quality, and community contributions.
        </p>
        <Button onClick={fetchLeaderboard} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Top 3 Podium */}
      {topPerformers.length >= 3 && (
        <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardContent className="pt-6">
            <div className="flex justify-center items-end gap-8">
              {/* 2nd Place */}
              <div className="text-center space-y-3">
                <Badge className={getRankBadgeColor(2)}>2nd Place</Badge>
                <Avatar className="h-16 w-16 mx-auto ring-4 ring-gray-300">
                  <AvatarImage src={topPerformers[1]?.avatar_url} />
                  <AvatarFallback>
                    {getInitials(topPerformers[1]?.full_name, topPerformers[1]?.username)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{topPerformers[1]?.full_name || topPerformers[1]?.username}</h3>
                  <p className="text-sm text-muted-foreground">PMF: {topPerformers[1]?.best_pmf_score}/100</p>
                </div>
              </div>

              {/* 1st Place */}
              <div className="text-center space-y-3 relative">
                <Crown className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                <Badge className={getRankBadgeColor(1)}>Champion</Badge>
                <Avatar className="h-20 w-20 mx-auto ring-4 ring-yellow-400">
                  <AvatarImage src={topPerformers[0]?.avatar_url} />
                  <AvatarFallback>
                    {getInitials(topPerformers[0]?.full_name, topPerformers[0]?.username)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg">{topPerformers[0]?.full_name || topPerformers[0]?.username}</h3>
                  <p className="text-sm text-muted-foreground">PMF: {topPerformers[0]?.best_pmf_score}/100</p>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="text-center space-y-3">
                <Badge className={getRankBadgeColor(3)}>3rd Place</Badge>
                <Avatar className="h-16 w-16 mx-auto ring-4 ring-orange-300">
                  <AvatarImage src={topPerformers[2]?.avatar_url} />
                  <AvatarFallback>
                    {getInitials(topPerformers[2]?.full_name, topPerformers[2]?.username)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{topPerformers[2]?.full_name || topPerformers[2]?.username}</h3>
                  <p className="text-sm text-muted-foreground">PMF: {topPerformers[2]?.best_pmf_score}/100</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Tabs */}
      <Tabs defaultValue="overall" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overall" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Overall
          </TabsTrigger>
          <TabsTrigger value="ideas" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Most Ideas
          </TabsTrigger>
          <TabsTrigger value="referrals" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Referrals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overall">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Top Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformers.map((entry, index) => (
                  <div
                    key={entry.username}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      index < 3 && 'bg-muted/50'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 flex justify-center">
                        {getRankIcon(index + 1)}
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={entry.avatar_url} />
                        <AvatarFallback>
                          {getInitials(entry.full_name, entry.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">{entry.full_name || entry.username}</h4>
                        <p className="text-sm text-muted-foreground">@{entry.username}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{entry.best_pmf_score}/100</div>
                      <div className="text-sm text-muted-foreground">
                        {entry.total_ideas} ideas • Avg: {Math.round(entry.avg_pmf_score)}/100
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ideas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Most Prolific Creators
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {byIdeas.map((entry, index) => (
                  <div
                    key={entry.username}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 flex justify-center">
                        <span className="text-sm font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={entry.avatar_url} />
                        <AvatarFallback>
                          {getInitials(entry.full_name, entry.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">{entry.full_name || entry.username}</h4>
                        <p className="text-sm text-muted-foreground">@{entry.username}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{entry.total_ideas}</div>
                      <div className="text-sm text-muted-foreground">
                        Ideas Created
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Community Builders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {byReferrals.map((entry, index) => (
                  <div
                    key={entry.username}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 flex justify-center">
                        <span className="text-sm font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={entry.avatar_url} />
                        <AvatarFallback>
                          {getInitials(entry.full_name, entry.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-semibold">{entry.full_name || entry.username}</h4>
                        <p className="text-sm text-muted-foreground">@{entry.username}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{entry.successful_referrals}</div>
                      <div className="text-sm text-muted-foreground">
                        Successful Referrals
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {leaderboard.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No leaderboard data yet</h3>
                <p className="text-muted-foreground">
                  Start creating ideas and contributing to the community to appear on the leaderboard!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}