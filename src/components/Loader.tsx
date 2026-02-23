'use client';

import { useState, useEffect, useRef } from 'react';

function lerp(x: number, x0: number, x1: number, y0: number, y1: number): number {
    const t = (x - x0) / (x1 - x0);
    return y0 + t * (y1 - y0);
}

function lerpColor(x: number, x0: number, x1: number, y0: number, y1: number): string {
    const b0 = y0 & 0xff;
    const g0 = (y0 & 0xff00) >> 8;
    const r0 = (y0 & 0xff0000) >> 16;

    const b1 = y1 & 0xff;
    const g1 = (y1 & 0xff00) >> 8;
    const r1 = (y1 & 0xff0000) >> 16;

    const r = Math.floor(lerp(x, x0, x1, r0, r1));
    const g = Math.floor(lerp(x, x0, x1, g0, g1));
    const b = Math.floor(lerp(x, x0, x1, b0, b1));

    return "#" + ("00000" + ((r << 16) | (g << 8) | b).toString(16)).slice(-6);
}

function lerpColorTable(
    vIndex: number,
    tValue: number,
    table: number[][]
): string {
    const rowCount = table.length;

    for (let i = 0; i < rowCount; ++i) {
        const a = table[i][0];

        if (i === 0 && tValue < a) {
            return lerpColor(
                tValue,
                a,
                table[i + 1][0],
                table[i][vIndex],
                table[i + 1][vIndex]
            );
        }

        if (i === rowCount - 1 && tValue >= a) {
            return lerpColor(
                tValue,
                table[i - 1][0],
                a,
                table[i - 1][vIndex],
                table[i][vIndex]
            );
        }

        if (tValue >= a && tValue <= table[i + 1][0]) {
            return lerpColor(
                tValue,
                a,
                table[i + 1][0],
                table[i][vIndex],
                table[i + 1][vIndex]
            );
        }
    }

    return '#ededed';
}

export default function Loader() {
    const [stroke, setStroke] = useState('#ededed');
    const [offset, setOffset] = useState(445);
    const animStartRef = useRef<number>(0);
    const animIdRef = useRef<number | null>(null);

    const colorTable = [
        // ease in
        [0.0, 0xf15a31],
        [0.2, 0xffd31b],
        [0.33, 0xa6ce42],
        [0.4, 0x007ac1],
        [0.45, 0x007ac1],
        // ease out
        [0.55, 0x007ac1],
        [0.6, 0x007ac1],
        [0.67, 0xa6ce42],
        [0.8, 0xffd31b],
        [1.0, 0xf15a31]
    ];

    const animate = () => {
        const pathWidth = 372;
        const speed = 2;
        const currentAnim = Date.now();
        const t = ((currentAnim - animStartRef.current) % 6000) / 6000; // 6secs for color animation cycle
        const colorValue = lerpColorTable(1, t, colorTable);

        setOffset(prevOffset => {
            let newOffset = prevOffset - speed;
            if (newOffset < 0) newOffset = pathWidth;
            return newOffset;
        });

        setStroke(colorValue);

        if (window.requestAnimationFrame) {
            animIdRef.current = window.requestAnimationFrame(animate);
        }
        return animIdRef.current;
    };

    const start = () => {
        animStartRef.current = Date.now();
        animIdRef.current = animate();
    };

    const stop = () => {
        if (animIdRef.current) {
            if (window.cancelAnimationFrame) {
                window.cancelAnimationFrame(animIdRef.current);
            }
            animIdRef.current = null;
        }
    };

    useEffect(() => {
        start();
        return () => stop();
    }, []);

    const pathStyle = {
        stroke: stroke,
        strokeDashoffset: offset
    };

    return (
        <div className="flex items-center justify-center" role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">Content is loading</span>
            <svg
                aria-hidden="true"
                height="120"
                width="120"
                viewBox="0 0 115 115"
                preserveAspectRatio="xMidYMid meet"
                className="inline-block"
            >
                <path
                    opacity="0.05"
                    fill="none"
                    stroke="#000000"
                    strokeWidth="3"
                    d="M 85 85 C -5 16 -39 127 78 30 C 126 -9 57 -16 85 85 C 94 123 124 111 85 85 Z"
                />
                <path
                    style={pathStyle}
                    className="progressPath"
                    fill="none"
                    strokeWidth="3"
                    strokeLinecap="round"
                    d="M 85 85 C -5 16 -39 127 78 30 C 126 -9 57 -16 85 85 C 94 123 124 111 85 85 Z"
                />
            </svg>
            <style jsx>{`
        .progressPath {
          stroke-dasharray: 60, 310;
          will-change: stroke, stroke-dashoffset;
        }
      `}</style>
        </div>
    );
}
