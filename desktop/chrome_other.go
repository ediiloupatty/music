//go:build !windows

package main

// Window-chrome controls are Windows-only; these are no-ops elsewhere.
func decorateWindow(hwnd uintptr)         {}
func hideOffscreen(hwnd uintptr)          {}
func parkDuringInit(stop <-chan struct{}) {}
func winReveal(hwnd uintptr)              {}
func winMinimize(hwnd uintptr)            {}
func winToggleMaximize(hwnd uintptr)      {}
func winDragStart(hwnd uintptr)           {}
