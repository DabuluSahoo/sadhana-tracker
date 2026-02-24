import React from 'react';

const VoiceLogo = ({ className = "w-24 h-24", color = "#CC5500", bookColor = "#ffffff" }) => {
    return (
        <svg
            viewBox="0 0 512 640"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Wheel of Knowledge */}
            <g transform="translate(256, 210)">
                {/* 8 Double-Line Spokes */}
                <g stroke={color} strokeWidth="6" strokeLinecap="round">
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
                        <g key={angle} transform={`rotate(${angle})`}>
                            <line x1="-8" y1="-120" x2="-8" y2="-20" />
                            <line x1="8" y1="-120" x2="8" y2="-20" />
                        </g>
                    ))}
                </g>

                {/* 8 Circles */}
                <g stroke={color} strokeWidth="5" fill="none">
                    {[22.5, 67.5, 112.5, 157.5, 202.5, 247.5, 292.5, 337.5].map((angle) => (
                        <circle key={angle} cx="0" cy="-75" r="32" transform={`rotate(${angle})`} />
                    ))}
                </g>

                {/* Center Hub */}
                <circle cx="0" cy="0" r="20" fill={bookColor} stroke={color} strokeWidth="5" />
            </g>

            {/* Open Book */}
            <g transform="translate(256, 520)">
                {/* Book Base (Filled) */}
                <path
                    d="M-200 0 Q-200 -20 0 -10 Q200 -20 200 0 L200 90 Q200 70 0 80 Q-200 70 -200 90 Z"
                    fill={bookColor}
                    stroke={color}
                    strokeWidth="4"
                />
                {/* Spine */}
                <line x1="0" y1="-10" x2="0" y2="80" stroke={color} strokeWidth="3" />
                {/* Page Details */}
                <g stroke={color} strokeWidth="2" opacity="0.3">
                    <path d="M-180 20 Q-100 10 -20 20" />
                    <path d="M-180 40 Q-100 30 -20 40" />
                    <path d="M-180 60 Q-100 50 -20 60" />
                    <path d="M180 20 Q100 10 20 20" />
                    <path d="M180 40 Q100 30 20 40" />
                    <path d="M180 60 Q100 50 20 60" />
                </g>
            </g>
        </svg>
    );
};

export default VoiceLogo;
