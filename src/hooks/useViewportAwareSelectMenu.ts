"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type MenuPlacement = "top" | "bottom";

interface UseViewportAwareSelectMenuOptions {
  minMenuHeight?: number;
  preferredMenuHeight?: number;
  viewportPadding?: number;
}

export const useViewportAwareSelectMenu = ({
  minMenuHeight = 180,
  preferredMenuHeight = 280,
  viewportPadding = 12,
}: UseViewportAwareSelectMenuOptions = {}) => {
  const controlRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<MenuPlacement>("bottom");
  const [maxMenuHeight, setMaxMenuHeight] = useState(preferredMenuHeight);

  const updateMenuMetrics = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const rect = controlRef.current?.getBoundingClientRect();
    const visualViewport = window.visualViewport;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const viewportBottom = viewportTop + viewportHeight;

    if (!rect) {
      setMenuPlacement("bottom");
      setMaxMenuHeight(preferredMenuHeight);
      return;
    }

    const availableAbove = Math.max(0, rect.top - viewportTop - viewportPadding);
    const availableBelow = Math.max(0, viewportBottom - rect.bottom - viewportPadding);
    const shouldOpenTop =
      availableBelow < minMenuHeight && availableAbove > availableBelow;
    const availableSpace = shouldOpenTop ? availableAbove : availableBelow;

    setMenuPlacement(shouldOpenTop ? "top" : "bottom");
    setMaxMenuHeight(
      Math.max(120, Math.min(preferredMenuHeight, Math.floor(availableSpace)))
    );
  }, [minMenuHeight, preferredMenuHeight, viewportPadding]);

  const bringControlIntoView = useCallback(() => {
    const control = controlRef.current;

    if (!control) {
      return;
    }

    window.setTimeout(() => {
      control.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });
    }, 80);
  }, []);

  const handleMenuOpen = useCallback(() => {
    setIsMenuOpen(true);
    bringControlIntoView();
    updateMenuMetrics();
    window.setTimeout(updateMenuMetrics, 120);
  }, [bringControlIntoView, updateMenuMetrics]);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleControlFocus = useCallback(() => {
    bringControlIntoView();
    window.setTimeout(updateMenuMetrics, 80);
  }, [bringControlIntoView, updateMenuMetrics]);

  useEffect(() => {
    if (!isMenuOpen || typeof window === "undefined") {
      return;
    }

    const handleViewportChange = () => {
      window.requestAnimationFrame(updateMenuMetrics);
    };

    const visualViewport = window.visualViewport;

    visualViewport?.addEventListener("resize", handleViewportChange);
    visualViewport?.addEventListener("scroll", handleViewportChange);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);

    return () => {
      visualViewport?.removeEventListener("resize", handleViewportChange);
      visualViewport?.removeEventListener("scroll", handleViewportChange);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
    };
  }, [isMenuOpen, updateMenuMetrics]);

  return {
    controlRef,
    handleControlFocus,
    handleMenuClose,
    handleMenuOpen,
    maxMenuHeight,
    menuPlacement,
  };
};
