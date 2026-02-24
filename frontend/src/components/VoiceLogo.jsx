import React from 'react';

const VoiceLogo = ({ className = "w-24 h-24", color = "currentColor" }) => {
    return (
        <svg
            viewBox="0 0 400 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Petals / Star Shape */}
            <g stroke={color} strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
                {/* Horizontal and Vertical Spikes */}
                <path d="M200 60 L200 180" />
                <path d="M200 220 L200 340" />
                <path d="M60 200 L180 200" />
                <path d="M220 200 L340 200" />

                {/* Diagonal Spikes */}
                <path d="M100 100 L185 185" />
                <path d="M215 215 L300 300" />
                <path d="M300 100 L215 185" />
                <path d="M185 215 L100 300" />
            </g>

            {/* Circles */}
            <g stroke={color} strokeWidth="10">
                <circle cx="200" cy="110" r="25" />
                <circle cx="200" cy="290" r="25" />
                <circle cx="110" cy="200" r="25" />
                <circle cx="290" cy="200" r="25" />

                <circle cx="135" cy="135" r="25" />
                <circle cx="265" cy="265" r="25" />
                <circle cx="265" cy="135" r="25" />
                <circle cx="135" cy="265" r="25" />
            </g>

            {/* Book Shape */}
            <g stroke={color} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
                <path d="M40 340 Q200 300 360 340" />
                <path d="M40 355 Q200 315 360 355" />
                <path d="M200 315 L200 380" />
                <path d="M40 340 L40 380" />
                <path d="M360 340 L360 380" />
                <path d="M40 380 Q200 340 360 380" />
            </g>
        </svg>
    );
};

export default VoiceLogo;
