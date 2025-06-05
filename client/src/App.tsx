
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import type { LogEntry, StreamStatus, LogFilterInput } from '../../server/src/schema';

function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [streamStatus, setStreamStatus] = useState<StreamStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sources, setSources] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<LogFilterInput>({
    level: undefined,
    type: undefined,
    source: undefined,
    keyword: undefined,
    limit: 100,
    offset: 0
  });
  
  // Search state
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);
  
  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [logsData, statusData, sourcesData] = await Promise.all([
        isSearchMode && searchKeyword 
          ? trpc.searchLogs.query({ keyword: searchKeyword, limit: filters.limit })
          : trpc.getLogs.query(filters),
        trpc.getStreamStatus.query(),
        trpc.getLogSources.query()
      ]);
      
      setLogs(logsData);
      setStreamStatus(statusData);
      setSources(sourcesData);
      setIsBackendConnected(true);
    } catch (error) {
      console.error('Failed to load data:', error);
      setError('Unable to connect to the log server. Please check if the backend is running.');
      setIsBackendConnected(false);
      // Set default status when backend is unavailable
      setStreamStatus({
        is_paused: false,
        last_update: new Date(),
        total_logs: 0
      });
    } finally {
      setIsLoading(false);
    }
  }, [filters, searchKeyword, isSearchMode]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && !streamStatus?.is_paused && isBackendConnected) {
      const interval = window.setInterval(loadData, 2000); // Refresh every 2 seconds
      setRefreshInterval(interval);
      return () => window.clearInterval(interval);
    } else if (refreshInterval) {
      window.clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
    return undefined;
  }, [autoRefresh, streamStatus?.is_paused, loadData, refreshInterval, isBackendConnected]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Stream control functions
  const handleStreamControl = async (action: 'pause' | 'resume' | 'clear') => {
    if (!isBackendConnected) {
      setError('Cannot control stream: Backend not connected');
      return;
    }
    
    try {
      await trpc.controlStream.mutate({ action });
      // Refresh status after action
      const newStatus = await trpc.getStreamStatus.query();
      setStreamStatus(newStatus);
      if (action === 'clear') {
        setLogs([]);
      }
      setError(null);
    } catch (error) {
      console.error(`Failed to ${action} stream:`, error);
      setError(`Failed to ${action} stream. Please try again.`);
    }
  };

  const handleClearLogs = async () => {
    if (!isBackendConnected) {
      setError('Cannot clear logs: Backend not connected');
      return;
    }
    
    try {
      await trpc.clearLogs.mutate();
      setLogs([]);
      const newStatus = await trpc.getStreamStatus.query();
      setStreamStatus(newStatus);
      setError(null);
    } catch (error) {
      console.error('Failed to clear logs:', error);
      setError('Failed to clear logs. Please try again.');
    }
  };

  // Search functionality
  const handleSearch = () => {
    if (!isBackendConnected) {
      setError('Cannot search: Backend not connected');
      return;
    }
    
    if (searchKeyword.trim()) {
      setIsSearchMode(true);
      loadData();
    }
  };

  const clearSearch = () => {
    setSearchKeyword('');
    setIsSearchMode(false);
    if (isBackendConnected) {
      loadData();
    }
  };

  // Filter handlers
  const updateFilter = (key: keyof LogFilterInput, value: string | number | undefined) => {
    setFilters((prev: LogFilterInput) => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({
      level: undefined,
      type: undefined,
      source: undefined,
      keyword: undefined,
      limit: 100,
      offset: 0
    });
  };

  // Log level styling
  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'error':
      case 'fatal':
        return 'destructive';
      case 'warn':
        return 'secondary';
      case 'info':
        return 'default';
      case 'debug':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'system':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'application':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'network':
        return 'bg-purple-100 text-purple-800 hover:bg-purple-200';
      case 'security':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🖥️ MacBook Log Monitor</h1>
            <p className="text-gray-600 mt-1">Real-time system log streaming dashboard</p>
          </div>
          
          {/* Stream Status */}
          <Card className="p-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  !isBackendConnected ? 'bg-red-500' : 
                  streamStatus?.is_paused ? 'bg-yellow-500' : 'bg-green-500'
                }`} />
                <span className="text-sm font-medium">
                  {!isBackendConnected ? '🔌 Disconnected' :
                   streamStatus?.is_paused ? '⏸️ Paused' : '▶️ Live'}
                </span>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <span className="text-sm text-gray-600">
                📊 Total: {streamStatus?.total_logs?.toLocaleString() || '0'}
              </span>
              <span className="text-sm text-gray-600">
                🕒 {streamStatus?.last_update?.toLocaleTimeString() || '--:--:--'}
              </span>
            </div>
          </Card>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">
              ⚠️ {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Backend Connection Warning */}
        {!isBackendConnected && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertDescription className="text-yellow-800">
              🔧 Backend server is not running. Start the server to begin monitoring logs.
            </AlertDescription>
          </Alert>
        )}

        {/* Controls */}
        <Card className="p-6">
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex space-x-2">
              <Input
                placeholder="🔍 Search logs by keyword..."
                value={searchKeyword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchKeyword(e.target.value)}
                onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
                disabled={!isBackendConnected}
              />
              <Button onClick={handleSearch} disabled={!searchKeyword.trim() || !isBackendConnected}>
                Search
              </Button>
              {isSearchMode && (
                <Button onClick={clearSearch} variant="outline">
                  Clear Search
                </Button>
              )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="level-filter" className="text-sm font-medium">Log Level</Label>
                <Select 
                  value={filters.level || 'all'} 
                  onValueChange={(value: string) => updateFilter('level', value === 'all' ? undefined : value)}
                  disabled={!isBackendConnected}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All levels</SelectItem>
                    <SelectItem value="debug">🐛 Debug</SelectItem>
                    <SelectItem value="info">ℹ️ Info</SelectItem>
                    <SelectItem value="warn">⚠️ Warning</SelectItem>
                    <SelectItem value="error">❌ Error</SelectItem>
                    <SelectItem value="fatal">💀 Fatal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type-filter" className="text-sm font-medium">Log Type</Label>
                <Select 
                  value={filters.type || 'all'} 
                  onValueChange={(value: string) => updateFilter('type', value === 'all' ? undefined : value)}
                  disabled={!isBackendConnected}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="system">🖥️ System</SelectItem>
                    <SelectItem value="application">📱 Application</SelectItem>
                    <SelectItem value="network">🌐 Network</SelectItem>
                    <SelectItem value="security">🔒 Security</SelectItem>
                    <SelectItem value="other">📄 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="source-filter" className="text-sm font-medium">Source</Label>
                <Select 
                  value={filters.source || 'all'} 
                  onValueChange={(value: string) => updateFilter('source', value === 'all' ? undefined : value)}
                  disabled={!isBackendConnected}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    {sources.map((source: string) => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end space-x-2">
                <Button onClick={clearFilters} variant="outline" className="flex-1" disabled={!isBackendConnected}>
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Stream Controls */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-refresh"
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                    disabled={!isBackendConnected}
                  />
                  <Label htmlFor="auto-refresh">Auto-refresh</Label>
                </div>
                
                <Button
                  onClick={() => handleStreamControl(streamStatus?.is_paused ? 'resume' : 'pause')}
                  variant={streamStatus?.is_paused ? 'default' : 'secondary'}
                  disabled={!isBackendConnected}
                >
                  {streamStatus?.is_paused ? '▶️ Resume' : '⏸️ Pause'} Stream
                </Button>
                
                <Button onClick={loadData} variant="outline" disabled={isLoading}>
                  {isLoading ? '⏳ Loading...' : '🔄 Refresh'}
                </Button>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={!isBackendConnected}>
                    🗑️ Clear All Logs
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear All Logs</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all log entries. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearLogs}>Clear Logs</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </Card>

        {/* Log Stream */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              📜 Log Stream {isSearchMode && `(Search: "${searchKeyword}")`}
            </h2>
            <span className="text-sm text-gray-500">
              Showing {logs.length} entries
            </span>
          </div>

          <ScrollArea className="h-[600px] w-full border rounded-lg">
            {!isBackendConnected ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">🔌</div>
                  <p className="text-lg font-medium">Backend Not Connected</p>
                  <p className="text-sm mt-1">Start the log server to begin monitoring</p>
                </div>
              </div>
            ) : logs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">📋</div>
                  <p>No logs found</p>
                  {isSearchMode && (
                    <p className="text-sm mt-1">Try adjusting your search or filters</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {logs.map((log: LogEntry) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant={getLevelBadgeVariant(log.level)}>
                          {log.level.toUpperCase()}
                        </Badge>
                        <Badge className={`${getTypeBadgeColor(log.type)} border-0`}>
                          {log.type}
                        </Badge>
                        <span className="text-sm font-medium text-gray-700">
                          {log.source}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        🕒 {log.timestamp.toLocaleString()}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm text-gray-800 leading-relaxed">
                        {log.message}
                      </p>
                      
                      {log.raw_content !== log.message && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                            📋 Raw content
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-100 rounded text-gray-700 overflow-x-auto whitespace-pre-wrap">
                            {log.raw_content}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}

export default App;
