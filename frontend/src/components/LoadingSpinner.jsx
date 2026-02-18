import { Loader2 } from 'lucide-react';

const LoadingSpinner = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <Loader2 className="w-10 h-10 text-saffron-600 animate-spin" />
            <p className="text-saffron-800 font-medium text-lg animate-pulse font-serif">
                Hare Krishna, please wait while loading...
            </p>
        </div>
    );
};

export default LoadingSpinner;
