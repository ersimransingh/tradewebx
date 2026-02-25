'use client';

import React, { useState } from 'react';
import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';

interface EmotionCacheProviderProps {
    children: React.ReactNode;
    nonce: string;
}

export default function EmotionCacheProvider({ children, nonce }: EmotionCacheProviderProps) {
    const [cache] = useState(() => {
        const emotionCache = createCache({
            key: 'twx',
            nonce: nonce,
            prepend: true, // Make sure styles are injected at the top of the head so they can be overridden by other styles if needed
        });
        return emotionCache;
    });

    return <CacheProvider value={cache}>{children}</CacheProvider>;
}
