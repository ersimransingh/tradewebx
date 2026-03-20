"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
// import axios from 'axios';
import { ACTION_NAME, PATH_URL } from '@/utils/constants';
import { BASE_URL } from '@/utils/constants';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { isEqual } from "lodash"
import apiService from '@/utils/apiService';
import { ThemeColors } from '@/types/ThemeColors';
import { getLocalStorage, storeLocalStorage } from '@/utils/helper';
// Define theme types
export type ThemeType = 'dark' | 'light' | 'lightDark' | 'blue';

// Define font settings interface
interface FontSettings {
  sidebar: string;
  content: string;
}


// Define themes
const initialThemes: Record<ThemeType, ThemeColors> = {
  dark: {
    background: '#334155',
    background2: '#1e293b',
    text: '#ffffff',
    primary: '#3B82F6',
    secondary: '#60A5FA',
    color1: '#475569',
    color2: '#4B5563',
    color3: '#64748B',
    textInputBackground: "#475569",
    textInputBorder: "#64748B",
    textInputText: "#E2E8F0",
    buttonBackground: "#3B82F6",
    buttonText: "#FFFFFF",
    errorText: "#EF4444",
    biometricBox: "#475569",
    biometricText: "#E2E8F0",
    cardBackground: "#ffffff",
    oddCardBackground: "#fff8e7",
    evenCardBackground: "#ffffff",
    filtersBackground: "#3F4758",
    tabBackground: "#3F4758",
    tabText: "#ffffff",
  },
  light:{
    background: '#F5F7FA',
    background2: '#E8ECEF',
    text: '#121212',
    primary: '#5B627E',      
    secondary: '#66A39B',    
    color1: '#DFC4AD',       
    color2: '#87AABD',       
    color3: '#BED0C4',
    textInputBackground: "#FFFFFF",
    textInputBorder: "#CED5D4", 
    textInputText: "#121212",
    buttonBackground: "#66A39B",
    buttonText: "#FFFFFF",
    errorText: "#EF4444",
    biometricBox: "#E8ECEF",
    biometricText: "#121212",
    cardBackground: "#FFFFFF",
    oddCardBackground: "#F5F7FA",
    evenCardBackground: "#E8ECEF",
    filtersBackground: "#FFFFFF",
    tabBackground: "#FFFFFF",
    tabText: "#121212",
},
  lightDark: {
    background: '#242424',
    background2: '#1e293b',
    text: '#E0E0E0',
    primary: '#a0c8ff',
    secondary: '#7ba7e0',
    color1: '#303030',
    color2: '#3a3a3a',
    color3: '#454545',
    textInputBackground: "#303030",
    textInputBorder: "#505050",
    textInputText: "#E0E0E0",
    buttonBackground: "#a0c8ff",
    buttonText: "#242424",
    errorText: "#FF8080",
    biometricBox: "#3a3a3a",
    biometricText: "#E0E0E0",
    cardBackground: "#303030",
    oddCardBackground: "#353535",
    evenCardBackground: "#3a3a3a",
    filtersBackground: "#303030",
    tabBackground: "#303030",
    tabText: "#E0E0E0",

  },
  blue: {
    background: '#E3F2FD',
    background2: '#f0f6fa',
    text: '#0D47A1',
    primary: '#2196F3',
    secondary: '#64B5F6',
    color1: '#BBDEFB',
    color2: '#90CAF9',
    color3: '#42A5F5',
    textInputBackground: "#FFFFFF",
    textInputBorder: "#90CAF9",
    textInputText: "#0D47A1",
    buttonBackground: "#2196F3",
    buttonText: "#FFFFFF",
    errorText: "#F44336",
    biometricBox: "#90CAF9",
    biometricText: "#0D47A1",
    cardBackground: "#FFFFFF",
    oddCardBackground: "#F5F9FF",
    evenCardBackground: "#E3F2FD",
    filtersBackground: "#FFFFFF",
    tabBackground: "#FFFFFF",
    tabText: "#0D47A1",

  },
};


interface ThemeContextType {
  theme: ThemeType;
  colors: ThemeColors;
  fonts: FontSettings;
  setTheme: (theme: ThemeType) => void;
  updateTheme: (themeData: Record<ThemeType, ThemeColors>) => void;
  updateFonts: (fontData: FontSettings) => void;
  availableThemes: ThemeType[];
  allThemes: Record<ThemeType, ThemeColors>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Storage keys for localStorage
export const THEME_STORAGE_KEY = 'app_theme';
export const THEME_COLORS_STORAGE_KEY = 'app_theme_colors';
const FONTS_STORAGE_KEY = 'app_fonts';

// Default font settings
const rawFontName = process.env.NEXT_PUBLIC_FONT_NAME || 'Arial';
const sanitizedFontName = rawFontName.replace(/['"]+/g, '').trim();

const defaultFonts: FontSettings = {
  sidebar: sanitizedFontName,
  content: sanitizedFontName
};

export const ThemeProvider: React.FC<{ children: React.ReactNode, nonce?: string }> = ({ children, nonce }) => {
  const [theme, setTheme] = useState<ThemeType>('light');
  const [themes, setThemes] = useState<Record<ThemeType, ThemeColors>>(initialThemes);
  const [fonts, setFonts] = useState<FontSettings>(defaultFonts);
  const [isLoading, setIsLoading] = useState(true);
  const themeFetchInFlight = useRef(false);
  const [hasFetchedTheme, setHasFetchedTheme] = useState(false);
  const fontStyleRef = useRef<HTMLStyleElement | null>(null);

  // Function to apply font face dynamically
  const applyFontFace = (fontName: string, fontUrl: string) => {
    if (typeof window === 'undefined') return;

    if (!fontStyleRef.current) {
      fontStyleRef.current = document.createElement('style');
      fontStyleRef.current.id = 'dynamic-font-client';
      if (nonce) fontStyleRef.current.nonce = nonce;
      document.head.appendChild(fontStyleRef.current);
    }

    const getFontFormat = (url: string) => {
      if (url.endsWith('.woff2')) return 'woff2';
      if (url.endsWith('.woff')) return 'woff';
      if (url.endsWith('.ttf')) return 'truetype';
      if (url.endsWith('.otf')) return 'opentype';
      return 'woff2'; // Default
    };

    fontStyleRef.current.textContent = `
      @font-face {
        font-family: '${fontName}';
        src: url('${fontUrl}') format('${getFontFormat(fontUrl)}');
        font-weight: normal;
        font-style: normal;
        font-display: swap;
      }
      :root {
        --dynamic-font: ${fontName}, Arial, sans-serif;
      }
    `;
  };

  // Function to check and set font
  const checkAndSetFont = async (fontSettings: FontSettings) => {
    try {
      // Check content font (prioritized)
      const fontToCheck = fontSettings.content || fontSettings.sidebar;
      const isArial = !fontToCheck || fontToCheck.toLowerCase() === 'arial';

      if (isArial) {
        setFonts(fontSettings);
        if (typeof window !== 'undefined') {
          // Clear any dynamic style tags
          if (fontStyleRef.current) {
            fontStyleRef.current.textContent = '';
          }
          // Reset the CSS variable on html element
          document.documentElement.style.setProperty('--dynamic-font', 'Arial, sans-serif');
          
          // Also try to remove the SSR style tag just in case
          const ssrStyle = document.getElementById('dynamic-font-ssg');
          if (ssrStyle) {
            ssrStyle.remove();
          }
        }
        return;
      }

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const cleanBasePath = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;
      
      const response = await fetch(`${cleanBasePath}/api/font-check?name=${encodeURIComponent(fontToCheck)}`);
      const data = await response.json();

      if (data.found) {
        applyFontFace(data.name, data.url);
        setFonts(fontSettings);
      } else {
        const fallbackFonts = { ...fontSettings, content: 'Arial', sidebar: 'Arial' };
        setFonts(fallbackFonts);
        if (typeof window !== 'undefined') {
          document.documentElement.style.setProperty('--dynamic-font', 'Arial, sans-serif');
        }
      }
    } catch (error) {
      console.error('Error checking font:', error);
      setFonts(fontSettings);
    }
  };
  const { userId: UserId, userType: UserType, isAuthenticated } = useSelector((state: RootState) => state.auth)
  // Add fetchThemes function
  const fetchThemes = async () => {
    try {
      const authToken = getLocalStorage('auth_token');
      if (!authToken) {
        console.warn('Skipping theme fetch: auth token not ready yet');
        return;
      }

      // Skip if token is expired to avoid 401s with stale sessions
      const tokenExpireTime = getLocalStorage('tokenExpireTime');
      if (tokenExpireTime && new Date(tokenExpireTime) < new Date()) {
        console.warn('Skipping theme fetch: auth token expired');
        return;
      }

      // Avoid duplicate calls when auth state changes rapidly
      if (hasFetchedTheme || themeFetchInFlight.current) {
        return;
      }

      themeFetchInFlight.current = true;

      const userData = {
        // UserId: localStorage.getItem('userId'),
        // UserType: localStorage.getItem('userType')
        UserId,
        UserType
      };

      const xmlData = `<dsXml>
        <J_Ui>"ActionName":"${ACTION_NAME}", "Option":"Theme","Level":1, "RequestFrom":"W"</J_Ui>
        <Sql/>
        <X_Filter>
        </X_Filter>
        <X_GFilter/>
        <J_Api>"UserId":"${userData.UserId}","UserType":"${userData.UserType}","AccYear":0,"MyDbPrefix":null,"MenuCode":0,"ModuleID":0,"MyDb":null,"DenyRights":null,"UserType":"${getLocalStorage('userType')}"</J_Api>
      </dsXml>`;

      const response = await apiService.postWithAuth(BASE_URL + PATH_URL, xmlData);
      if (response.data?.data?.rs0?.[0]?.LevelSetting) {
        const parsedThemeSettings = JSON.parse(response.data.data.rs0[0].LevelSetting);

        if (response.data?.data?.rs1?.[0]?.LevelSetting1) {
          let levelSetting = response.data.data.rs1[0].LevelSetting1;
          
          try {
            // Auto-fix common truncation: check if braces are balanced
            const openBraces = (levelSetting.match(/{/g) || []).length;
            const closeBraces = (levelSetting.match(/}/g) || []).length;
            if (openBraces > closeBraces) {
              levelSetting += '}'.repeat(openBraces - closeBraces);
            }
            // for testing purpose to check custom fonts 
            // const parsedFontSettings =  {
            //   fontSettings: {
            //     sidebar: "Selawik-Bold",
            //     content: "Selawik-Bold"
            //   }
            // }
             const parsedFontSettings = JSON.parse(levelSetting);
            
            if (parsedFontSettings.fontSettings) {
              await checkAndSetFont(parsedFontSettings.fontSettings);
              // Save to localStorage
              storeLocalStorage(FONTS_STORAGE_KEY, JSON.stringify(parsedFontSettings.fontSettings));
            }
          } catch (error) {
            console.error('Invalid JSON in LevelSetting1, attempting regex extraction:', error);
            
            // Generic extraction: look for "content":"..." or "sidebar":"..."
            const contentMatch = levelSetting.match(/"content"\s*:\s*"([^"]+)"/i);
            const sidebarMatch = levelSetting.match(/"sidebar"\s*:\s*"([^"]+)"/i);
            const extractedFont = (contentMatch?.[1] || sidebarMatch?.[1]);

            if (extractedFont) {
              await checkAndSetFont({ 
                sidebar: sidebarMatch?.[1] || extractedFont, 
                content: contentMatch?.[1] || extractedFont 
              });
            }
          }
        }

        setThemes(prevThemes => ({
          ...prevThemes,
          ...parsedThemeSettings
        }));
        setHasFetchedTheme(true);

        // Save to localStorage
        const localSavedThemeColors = getLocalStorage(THEME_COLORS_STORAGE_KEY);
        try {
          const parsedLocalThemeColors = JSON.parse(localSavedThemeColors);
          if (!isEqual(parsedLocalThemeColors, parsedThemeSettings)) {
            storeLocalStorage(THEME_COLORS_STORAGE_KEY, JSON.stringify(parsedThemeSettings));
          }
        } catch (err) {
          storeLocalStorage(THEME_COLORS_STORAGE_KEY, JSON.stringify(parsedThemeSettings));
        }
      }
    } catch (error) {
      console.error('Error fetching theme data:', error);
      // Fallback to initial themes if API fails (from Localstorage or intialThemes)
      const savedThemeColors = getLocalStorage(THEME_COLORS_STORAGE_KEY);
      if (savedThemeColors) {
        setThemes(JSON.parse(savedThemeColors));
      } else {
        setThemes(initialThemes);
      }
    } finally {
      themeFetchInFlight.current = false;
    }
  };

  useEffect(() => {
    const loadTheme = async () => {
      // Remove SSR injected style tag once client-side is ready
      if (typeof window !== 'undefined') {
        const ssrStyle = document.getElementById('dynamic-font-ssg');
        if (ssrStyle) ssrStyle.remove();
      }

      try {
        // First try to load from localStorage
        const savedThemeColors = getLocalStorage(THEME_COLORS_STORAGE_KEY);
        if (savedThemeColors) {
          setThemes(JSON.parse(savedThemeColors));
        } else {
          setThemes(initialThemes);
        }

        const savedTheme = getLocalStorage(THEME_STORAGE_KEY);
        if (savedTheme) {
          setTheme(savedTheme as ThemeType);
        }

        const savedFonts = getLocalStorage(FONTS_STORAGE_KEY);
        if (savedFonts) {
          try {
            const parsedFonts = JSON.parse(savedFonts);
            await checkAndSetFont(parsedFonts);
          } catch (e) {
            console.error('Error parsing saved fonts:', e);
            if (process.env.NEXT_PUBLIC_FONT_NAME) {
              await checkAndSetFont(defaultFonts);
            }
          }
        } else if (process.env.NEXT_PUBLIC_FONT_NAME) {
          // If no saved fonts but env font exists, try to load it
          await checkAndSetFont(defaultFonts);
        }

      } catch (error) {
        console.error('Failed to load theme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (typeof window !== 'undefined') {
      loadTheme();
    }
  }, []);

  // Update theme and save to localStorage
  const handleSetTheme = (newTheme: ThemeType) => {
    try {
      storeLocalStorage(THEME_STORAGE_KEY, newTheme);
      setTheme(newTheme);
      // Optional: Update document body class for global CSS changes
      document.body.className = newTheme;
    } catch (error) {
      console.error('Failed to save theme to storage:', error);
    }
  };

  // Update theme colors
  const updateTheme = (themeData: Record<ThemeType, ThemeColors>) => {
    try {
      setThemes(themeData);
      storeLocalStorage(THEME_COLORS_STORAGE_KEY, JSON.stringify(themeData));
    } catch (error) {
      console.error('Failed to update theme colors:', error);
    }
  };

  // Update font settings
  const updateFonts = (fontData: FontSettings) => {
    try {
      setFonts(fontData);
      storeLocalStorage(FONTS_STORAGE_KEY, JSON.stringify(fontData));
    } catch (error) {
      console.error('Failed to update font settings:', error);
    }
  };

  const value = {
    theme,
    colors: themes[theme] || initialThemes[theme],
    fonts,
    setTheme: handleSetTheme,
    updateTheme,
    updateFonts,
    availableThemes: Object.keys(themes) as ThemeType[],
    allThemes: themes,
  };

  useEffect(() => {
    // Skip theme fetch if we're on SSO page (pathname check)
    if (typeof window !== 'undefined' && window.location.pathname.includes('/sso')) {
      console.log('SSO page detected - skipping theme fetch to prevent premature API calls');
      return;
    }

    // Fetch theme if user is authenticated successfully
    if (UserId && UserType && isAuthenticated) {
      fetchThemes();
    } else {
      // Reset fetch flags when user logs out or before login completes
      setHasFetchedTheme(false);
      themeFetchInFlight.current = false;
    }
  }, [UserId, UserType, isAuthenticated])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  // If we're on the server or outside a ThemeProvider, return default values
  if (context === undefined) {
    // Don't throw an error if we're on the server
    if (typeof window === 'undefined') {
      return {
        theme: 'light' as ThemeType,
        colors: initialThemes['light'],
        fonts: defaultFonts,
        setTheme: () => { },
        updateTheme: () => { },
        updateFonts: () => { },
        availableThemes: Object.keys(initialThemes) as ThemeType[],
        allThemes: initialThemes,
      };
    }
    // Only throw if we're on the client and outside a ThemeProvider
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
