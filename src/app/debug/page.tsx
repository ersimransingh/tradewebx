import ConnectionTest from '../../components/debug/ConnectionTest';
import LocalStorageHealthCheck from '../../components/debug/LocalStorageHealthCheck';

export default function DebugPage() {
    return (
        <div className="min-h-screen bg-gray-100 py-8">
            <div className="max-w-4xl mx-auto px-4">
                <h1 className="text-3xl font-bold text-center mb-8">TradeWebX Debug Page</h1>
                <div className="space-y-8">
                    <LocalStorageHealthCheck />
                    <ConnectionTest />
                </div>
            </div>
        </div>
    );
}
