'use client';

import { useEffect, useRef } from 'react';

export default function Loader() {
    const svgRef = useRef<SVGSVGElement>(null);
    const rotationRef = useRef(0);
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        intervalRef.current = window.setInterval(() => {
            rotationRef.current = (rotationRef.current + 6) % 360;
            if (svgRef.current) {
                svgRef.current.style.transform = `rotate(${rotationRef.current}deg)`;
            }
        }, 16) as unknown as number;

        return () => {
            if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, []);

    return (
        <div
            className="flex items-center justify-center"
            role="status"
            aria-live="polite"
            aria-busy="true"
        >
            <span className="sr-only">Content is loading</span>
            <svg
                ref={svgRef}
                aria-hidden="true"
                width="48"
                height="48"
                viewBox="0 0 48 48"
            >
                {/* Track circle */}
                <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="4"
                />
                {/* Spinning arc */}
                <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="#465fff"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="40 86"
                />
            </svg>
        </div>
    );
}
