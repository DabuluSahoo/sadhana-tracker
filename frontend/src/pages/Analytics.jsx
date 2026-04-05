import { useState, useEffect, useContext } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import AuthContext from '../context/AuthContext';
import SadhanaAnalytics from '../components/SadhanaAnalytics';

const Analytics = () => {
    const { user } = useContext(AuthContext);

    // Protect route for roles that do not perform sadhana
    if (user?.role === 'owner' || ['brahmacari', 'other', 'yudhisthir'].includes(user?.group_name)) {
        return <Navigate to="/" />;
    }

    const [logs, setLogs]       = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const { data } = await api.get('/sadhana/history');
                setLogs(data);
            } catch (err) {
                console.error('Failed to fetch history for stats', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    if (loading) return <LoadingSpinner />;

    return (
        <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-saffron-100">
                <h1 className="text-2xl font-serif font-bold text-gray-800">Spiritual Analytics</h1>
                <p className="text-sm text-gray-500 mt-1">Visualize your sadhana progress over the last 30 days.</p>
            </div>

            {logs.length > 0
                ? <SadhanaAnalytics logs={logs} />
                : (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
                        <p className="text-4xl mb-3">📊</p>
                        <p className="font-semibold">No data yet</p>
                        <p className="text-sm mt-1">Start logging your sadhana to see charts here.</p>
                    </div>
                )
            }
        </div>
    );
};

export default Analytics;
