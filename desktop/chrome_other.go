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
func saveWindowState(hwnd uintptr)        {}
func checkEnvironment() bool              { return true }

// mediaKeyCh is never written to on non-Windows; the goroutine in main blocks
// harmlessly until the process exits.
var mediaKeyCh = make(chan string, 4)
