import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';

export default function Home() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastPickup, setLastPickup] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/get-logs');
      const data = await response.json();
      setLogs(data.logs || []);
      if (data.logs && data.logs.length > 0) {
        setLastPickup(data.logs[0]);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const handlePickup = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/log-pickup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          child: 'Victor'
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setLastPickup(result.log);
        fetchLogs(); // Refresh the logs
        
        // Show success feedback
        alert(`✅ Victor opgehaald! Kosten: €${result.log.cost.toFixed(2)}`);
      }
    } catch (error) {
      console.error('Error logging pickup:', error);
      alert('❌ Er ging iets mis bij het loggen van de ophaling');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const response = await fetch('/api/export-csv');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `victor-opvang-${format(new Date(), 'yyyy-MM')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('❌ Er ging iets mis bij het exporteren');
    }
  };

  const todayLogs = logs.filter(log => 
    format(parseISO(log.timestamp), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  );

  const thisMonthTotal = logs
    .filter(log => 
      format(parseISO(log.timestamp), 'yyyy-MM') === format(new Date(), 'yyyy-MM')
    )
    .reduce((total, log) => total + log.cost, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
            🎒 Victor Opvang Tracker
          </h1>

          {/* Pickup Button */}
          <button
            onClick={handlePickup}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-lg text-lg transition duration-200 mb-4"
          >
            {loading ? '⏳ Bezig...' : '✅ Victor Opgehaald!'}
          </button>

          {/* Last Pickup Info */}
          {lastPickup && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">Laatste ophaling:</h3>
              <p className="text-sm text-gray-600">
                {format(parseISO(lastPickup.timestamp), 'dd MMMM yyyy - HH:mm', { locale: nl })}
              </p>
              <p className="text-lg font-bold text-green-600">
                Kosten: €{lastPickup.cost.toFixed(2)}
              </p>
            </div>
          )}

          {/* Today's Summary */}
          {todayLogs.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-700 mb-2">Vandaag:</h3>
              <p className="text-sm text-gray-600">{todayLogs.length} ophaling(en)</p>
              <p className="text-lg font-bold text-blue-600">
                Totaal: €{todayLogs.reduce((sum, log) => sum + log.cost, 0).toFixed(2)}
              </p>
            </div>
          )}

          {/* Monthly Summary */}
          <div className="bg-purple-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-700 mb-2">Deze maand:</h3>
            <p className="text-lg font-bold text-purple-600">
              Totaal: €{thisMonthTotal.toFixed(2)}
            </p>
          </div>

          {/* Export Button */}
          <button
            onClick={exportCSV}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
          >
            📊 Export Maandrapport (CSV)
          </button>
        </div>

        {/* Recent Logs */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Recente Ophalingen</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {logs.slice(0, 10).map((log, index) => (
              <div key={index} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {format(parseISO(log.timestamp), 'dd/MM HH:mm', { locale: nl })}
                  </p>
                  <p className="text-xs text-gray-500">{log.timeSlot}</p>
                </div>
                <span className="font-bold text-green-600">€{log.cost.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
